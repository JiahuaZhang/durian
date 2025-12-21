import os
import asyncio
import logging
from typing import Dict, Any
from datetime import datetime

from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

from ..base_strategy import TradingStrategy
from ..registry import StrategyRegistry
from .engine import AIPortfolioStrategy as PortfolioEngine

logger = logging.getLogger(__name__)

load_dotenv()


class GeminiPortfolioStrategy(TradingStrategy):   
    def __init__(self, **config):
        super().__init__(**config)
        
        self.portfolio_size = int(config.get('portfolio_size') or os.getenv('GEMINI_PORTFOLIO_SIZE', '15'))
        self.model = config.get('model') or os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        self.schedule_hour = int(config.get('schedule_hour') or os.getenv('GEMINI_SCHEDULE_HOUR', '9'))
        self.schedule_minute = int(config.get('schedule_minute') or os.getenv('GEMINI_SCHEDULE_MINUTE', '30'))
        
        self.trading_client = None
        self.portfolio_engine = None
        self.scheduler = None
        
        logger.info(f"Gemini Portfolio configured: {self.portfolio_size} assets, {self.model}")
    
    def get_name(self) -> str:
        return "gemini-portfolio"
    
    def get_type(self) -> str:
        return "scheduled"
    
    async def initialize(self):
        alpaca_key = os.getenv("ALPACA_API_KEY")
        alpaca_secret = os.getenv("ALPACA_SECRET_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY")
        
        if not all([alpaca_key, alpaca_secret, gemini_key]):
            raise ValueError("ALPACA_API_KEY, ALPACA_SECRET_KEY, and GEMINI_API_KEY environment variables required")
        
        self.trading_client = TradingClient(
            api_key=alpaca_key,
            secret_key=alpaca_secret,
            paper=True  # Paper trading
        )
        
        self.portfolio_engine = PortfolioEngine(
            alpaca_key=alpaca_key,
            alpaca_secret=alpaca_secret,
            gemini_key=gemini_key,
            portfolio_size=self.portfolio_size
        )
        
        self.scheduler = AsyncIOScheduler()
        
        logger.info("✅ Gemini Portfolio strategy initialized")
    
    def is_ready(self) -> bool:
        return self.trading_client is not None and self.portfolio_engine is not None
    
    async def start(self):
        if not self.is_ready():
            raise RuntimeError("Strategy not initialized. Call initialize() first.")
        
        self.is_running = True
        logger.info(f"🚀 Starting Gemini Portfolio strategy")
        logger.info(f"   Schedule: Daily at {self.schedule_hour}:{self.schedule_minute:02d} ET (weekdays)")
        
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
        
        self.scheduler.start()
        
        job = self.scheduler.get_job('daily_rebalance')
        if job and job.trigger:
            import pytz
            et_tz = pytz.timezone('America/New_York')
            now = datetime.now(et_tz)
            next_run = job.trigger.get_next_fire_time(None, now)
            if next_run:
                logger.info(f"📅 Next rebalance: {next_run.strftime('%Y-%m-%d %I:%M %p %Z')}")
        
        try:
            while self.is_running:
                await asyncio.sleep(60) 
        except asyncio.CancelledError:
            logger.info("Gemini Portfolio strategy cancelled")
    
    async def stop(self):
        self.is_running = False
        logger.info("Stopping Gemini Portfolio strategy...")
        
        if self.scheduler:
            self.scheduler.shutdown(wait=False)
        
        logger.info("✅ Gemini Portfolio strategy stopped")
    
    async def _execute_rebalance(self):
        try:
            logger.info("\n" + "=" * 70)
            logger.info("🤖 STARTING DAILY PORTFOLIO REBALANCING")
            logger.info("=" * 70)
            
            market_analysis, scores, allocation = self.portfolio_engine.run_analysis()
            
            logger.info("\n📊 AI MARKET ANALYSIS:")
            logger.info(market_analysis[:500] + "..." if len(market_analysis) > 500 else market_analysis)
            
            logger.info("\n💼 RECOMMENDED PORTFOLIO:")
            for symbol, weight in sorted(allocation.allocations.items(), key=lambda x: x[1], reverse=True):
                logger.info(f"   {symbol:6s}: {weight*100:5.1f}%")
            
            if allocation.rebalance_required:
                logger.info("\n🔄 Executing rebalance...")
                await self._rebalance_portfolio(allocation.allocations)
                logger.info("✅ Rebalancing complete!")
            else:
                logger.info("✅ No rebalancing required - portfolio is optimal")
        
        except Exception as e:
            logger.error(f"❌ Error during rebalancing: {e}", exc_info=True)
    
    async def _rebalance_portfolio(self, target_allocations: dict):
        try:
            account = self.trading_client.get_account()
            total_equity = float(account.equity)
            
            current_positions = {p.symbol: p for p in self.trading_client.get_all_positions()}
            
            for symbol in current_positions:
                if symbol not in target_allocations:
                    logger.info(f"🔴 Closing position: {symbol}")
                    self.trading_client.close_position(symbol)
            
            target_dollars = {
                symbol: weight * total_equity 
                for symbol, weight in target_allocations.items()
            }
            
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
        stats = {
            'strategy': self.get_name(),
            'portfolio_size': self.portfolio_size,
            'model': self.model,
            'scheduler_running': self.scheduler.running if self.scheduler else False
        }
        
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


# Standalone execution for testing
async def main():
    """Run Gemini Portfolio strategy standalone for testing."""
    strategy = GeminiPortfolioStrategy()
    
    try:
        await strategy.initialize()
        await strategy.start()
    except KeyboardInterrupt:
        logger.info("\n🛑 Shutting down...")
        await strategy.stop()
        logger.info("✅ Strategy stopped")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    asyncio.run(main())
