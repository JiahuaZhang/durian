"""
Gemini AI Portfolio Strategy

Scheduled strategy that rebalances a 15-asset portfolio daily using Gemini AI analysis.
"""

import os
import asyncio
import logging
from typing import Dict, Any
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

from ..base_strategy import TradingStrategy
from ..registry import StrategyRegistry
from .engine import AIPortfolioStrategy as PortfolioEngine

logger = logging.getLogger(__name__)


class GeminiPortfolioStrategy(TradingStrategy):
    """Gemini AI-powered portfolio rebalancing strategy."""
    
    def __init__(self, **config):
        super().__init__(**config)
        
        # Configuration
        self.portfolio_size = config.get('portfolio_size', 15)
        self.model = config.get('model', 'gemini-2.0-flash-exp')
        self.schedule_hour = config.get('schedule_hour', 15)  # 3 PM ET
        self.schedule_minute = config.get('schedule_minute', 45)  # :45
        
        # Portfolio engine (reuses existing ai_portfolio_strategy.py)
        self.portfolio_engine = None
        self.scheduler = None
        
        logger.info(f"Gemini Portfolio configured: {self.portfolio_size} assets, {self.model}")
    
    def get_name(self) -> str:
        return "gemini-portfolio"
    
    def get_type(self) -> str:
        return "scheduled"
    
    async def initialize(self, trading_client: TradingClient, **kwargs):
        """Initialize with trading client and Gemini API."""
        self.trading_client = trading_client
        
        # Get API keys
        alpaca_key = os.getenv("ALPACA_API_KEY")
        alpaca_secret = os.getenv("ALPACA_SECRET_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY")
        
        if not gemini_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        # Initialize portfolio engine
        self.portfolio_engine = PortfolioEngine(
            alpaca_key=alpaca_key,
            alpaca_secret=alpaca_secret,
            gemini_key=gemini_key,
            portfolio_size=self.portfolio_size
        )
        
        # Create scheduler
        self.scheduler = AsyncIOScheduler()
        
        logger.info("✅ Gemini Portfolio strategy initialized")
    
    async def start(self):
        """Start the daily rebalancing scheduler."""
        if not self.is_ready():
            raise RuntimeError("Strategy not initialized. Call initialize() first.")
        
        self.is_running = True
        logger.info(f"🚀 Starting Gemini Portfolio strategy")
        logger.info(f"   Schedule: Daily at {self.schedule_hour}:{self.schedule_minute:02d} ET (weekdays)")
        
        # Schedule daily rebalancing
        self.scheduler.add_job(
            self._execute_rebalance,
            CronTrigger(
                day_of_week='mon-fri',
                hour=self.schedule_hour,
                minute=self.schedule_minute,
                timezone='America/New_York'
            ),
            id='daily_rebalance',
            name='Daily Portfolio Rebalance'
        )
        
        # Start scheduler
        self.scheduler.start()
        
        # Log next run time
        job = self.scheduler.get_job('daily_rebalance')
        if job and job.trigger:
            import pytz
            et_tz = pytz.timezone('America/New_York')
            now = datetime.now(et_tz)
            next_run = job.trigger.get_next_fire_time(None, now)
            if next_run:
                logger.info(f"📅 Next rebalance: {next_run.strftime('%Y-%m-%d %I:%M %p %Z')}")
        
        # Keep running
        try:
            while self.is_running:
                await asyncio.sleep(60)  # Check every minute
        except asyncio.CancelledError:
            logger.info("Gemini Portfolio strategy cancelled")
    
    async def stop(self):
        """Stop the scheduler and cleanup."""
        self.is_running = False
        logger.info("Stopping Gemini Portfolio strategy...")
        
        if self.scheduler:
            self.scheduler.shutdown(wait=False)
        
        logger.info("✅ Gemini Portfolio strategy stopped")
    
    async def _execute_rebalance(self):
        """Execute portfolio rebalancing."""
        try:
            logger.info("\n" + "=" * 70)
            logger.info("🤖 STARTING DAILY PORTFOLIO REBALANCING")
            logger.info("=" * 70)
            
            # Run AI analysis
            market_analysis, scores, allocation = self.portfolio_engine.run_analysis()
            
            # Log recommendations
            logger.info("\n📊 AI MARKET ANALYSIS:")
            logger.info(market_analysis[:500] + "..." if len(market_analysis) > 500 else market_analysis)
            
            logger.info("\n💼 RECOMMENDED PORTFOLIO:")
            for symbol, weight in sorted(allocation.allocations.items(), 
                                        key=lambda x: x[1], reverse=True):
                logger.info(f"   {symbol:6s}: {weight*100:5.1f}%")
            
            # Execute rebalancing if needed
            if allocation.rebalance_required:
                logger.info("\n🔄 Executing rebalance...")
                await self._rebalance_portfolio(allocation.allocations)
                logger.info("✅ Rebalancing complete!")
            else:
                logger.info("✅ No rebalancing required - portfolio is optimal")
        
        except Exception as e:
            logger.error(f"❌ Error during rebalancing: {e}", exc_info=True)
    
    async def _rebalance_portfolio(self, target_allocations: dict):
        """Rebalance portfolio to target allocations."""
        try:
            account = self.trading_client.get_account()
            total_equity = float(account.equity)
            
            # Close positions not in target
            current_positions = {p.symbol: p for p in self.trading_client.get_all_positions()}
            
            for symbol in current_positions:
                if symbol not in target_allocations:
                    logger.info(f"🔴 Closing position: {symbol}")
                    self.trading_client.close_position(symbol)
            
            # Calculate target dollar amounts
            target_dollars = {
                symbol: weight * total_equity 
                for symbol, weight in target_allocations.items()
            }
            
            # Execute orders
            for symbol, target_value in target_dollars.items():
                try:
                    current_value = 0
                    if symbol in current_positions:
                        current_value = float(current_positions[symbol].market_value)
                    
                    adjustment = target_value - current_value
                    
                    if abs(adjustment) < 10:  # Skip small adjustments
                        continue
                    
                    side = OrderSide.BUY if adjustment > 0 else OrderSide.SELL
                    notional = round(abs(adjustment), 2)
                    
                    logger.info(f"{'🟢' if side == OrderSide.BUY else '🔴'} "
                              f"{side.value} {symbol}: ${notional:,.2f}")
                    
                    order_request = MarketOrderRequest(
                        symbol=symbol,
                        notional=notional,
                        side=side,
                        time_in_force=TimeInForce.DAY
                    )
                    
                    order = self.trading_client.submit_order(order_data=order_request)
                    logger.info(f"   ✅ Order submitted: {order.id}")
                
                except Exception as e:
                    logger.error(f"   ❌ Error trading {symbol}: {e}")
                    continue
            
            logger.info("✅ All orders submitted")
        
        except Exception as e:
            logger.error(f"❌ Error rebalancing: {e}", exc_info=True)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get strategy statistics."""
        stats = {
            'strategy': self.get_name(),
            'portfolio_size': self.portfolio_size,
            'model': self.model,
            'scheduler_running': self.scheduler.running if self.scheduler else False
        }
        
        # Add account info
        if self.trading_client:
            try:
                account = self.trading_client.get_account()
                positions = self.trading_client.get_all_positions()
                
                stats['equity'] = float(account.equity)
                stats['cash'] = float(account.cash)
                stats['positions_count'] = len(positions)
            except:
                pass
        
        return stats


# Register strategy
StrategyRegistry.register('gemini-portfolio', GeminiPortfolioStrategy)
