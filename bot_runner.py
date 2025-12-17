"""
Durian Invest - Multi-Strategy Bot Runner

Unified orchestrator that runs one or more trading strategies.
Strategies are configured via the STRATEGIES environment variable.
"""

import os
import sys
import asyncio
import logging
import signal
from typing import List
from dotenv import load_dotenv

from alpaca.trading.client import TradingClient

# Import strategies to trigger auto-registration
from strategies import StrategyRegistry, TradingStrategy, SMAStrategy, GeminiPortfolioStrategy

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


class BotRunner:
    """
    Multi-strategy bot orchestrator.
    
    Loads and runs multiple trading strategies concurrently.
    """
    
    def __init__(self, strategy_names: List[str]):
        """
        Initialize bot runner with strategy names.
        
        Args:
            strategy_names: List of strategy identifiers (e.g., ['sma', 'gemini-portfolio'])
        """
        self.strategy_names = strategy_names
        self.strategies: List[TradingStrategy] = []
        self.trading_client = None
        self.shutdown_event = asyncio.Event()
        
        logger.info("=" * 70)
        logger.info("🚀 DURIAN INVEST - MULTI-STRATEGY BOT")
        logger.info("=" * 70)
        logger.info(f"Strategies to load: {', '.join(strategy_names)}")
    
    def _validate_environment(self):
        """Validate required environment variables."""
        alpaca_key = os.getenv("ALPACA_API_KEY")
        alpaca_secret = os.getenv("ALPACA_SECRET_KEY")
        
        if not alpaca_key or not alpaca_secret:
            logger.error("❌ ALPACA_API_KEY and ALPACA_SECRET_KEY must be set!")
            sys.exit(1)
        
        # Check for Gemini API key if Gemini strategy is requested
        if 'gemini-portfolio' in self.strategy_names:
            gemini_key = os.getenv("GEMINI_API_KEY")
            if not gemini_key:
                logger.error("❌ GEMINI_API_KEY required for gemini-portfolio strategy!")
                sys.exit(1)
    
    def _get_strategy_config(self, name: str) -> dict:
        """Get configuration for a strategy from environment variables."""
        config = {}
        
        if name == 'sma':
            config = {
                'symbol': os.getenv('SMA_SYMBOL', 'BTC/USD'),
                'fast_period': int(os.getenv('SMA_FAST_PERIOD', '5')),
                'slow_period': int(os.getenv('SMA_SLOW_PERIOD', '15')),
                'trade_qty': float(os.getenv('SMA_TRADE_QTY', '0.001'))
            }
        elif name == 'gemini-portfolio':
            config = {
                'portfolio_size': int(os.getenv('GEMINI_PORTFOLIO_SIZE', '15')),
                'model': os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp'),
                'schedule_hour': int(os.getenv('GEMINI_SCHEDULE_HOUR', '15')),
                'schedule_minute': int(os.getenv('GEMINI_SCHEDULE_MINUTE', '45'))
            }
        
        return config
    
    async def load_strategies(self):
        """Load and initialize all configured strategies."""
        # Create shared trading client
        self.trading_client = TradingClient(
            api_key=os.getenv("ALPACA_API_KEY"),
            secret_key=os.getenv("ALPACA_SECRET_KEY"),
            paper=True  # PAPER TRADING
        )
        
        logger.info("✅ Alpaca trading client initialized (PAPER MODE)")
        
        # Load each strategy
        for name in self.strategy_names:
            try:
                # Get strategy-specific config
                config = self._get_strategy_config(name)
                
                # Create strategy instance
                strategy = StrategyRegistry.create(name, **config)
                
                # Initialize strategy
                await strategy.initialize(self.trading_client)
                
                self.strategies.append(strategy)
                logger.info(f"✅ Loaded strategy: {name} ({strategy.get_type()})")
                
            except Exception as e:
                logger.error(f"❌ Failed to load strategy '{name}': {e}")
                sys.exit(1)
        
        logger.info(f"\n✅ All {len(self.strategies)} strategies loaded successfully")
    
    async def run(self):
        """Run all strategies concurrently."""
        if not self.strategies:
            logger.error("No strategies loaded!")
            return
        
        # Log account status
        self._log_account_status()
        
        logger.info("\n" + "=" * 70)
        logger.info("▶️  STARTING ALL STRATEGIES")
        logger.info("=" * 70)
        
        # Start all strategies concurrently
        tasks = [strategy.start() for strategy in self.strategies]
        tasks.append(self._wait_for_shutdown())
        
        try:
            await asyncio.gather(*tasks)
        except asyncio.CancelledError:
            logger.info("\n🛑 Shutdown initiated...")
    
    async def _wait_for_shutdown(self):
        """Wait for shutdown signal."""
        await self.shutdown_event.wait()
    
    async def shutdown(self):
        """Gracefully shutdown all strategies."""
        logger.info("\n" + "=" * 70)
        logger.info("🛑 SHUTTING DOWN")
        logger.info("=" * 70)
        
        # Signal shutdown
        self.shutdown_event.set()
        
        # Stop all strategies
        for strategy in self.strategies:
            try:
                logger.info(f"Stopping {strategy.get_name()}...")
                await strategy.stop()
            except Exception as e:
                logger.error(f"Error stopping {strategy.get_name()}: {e}")
        
        logger.info("✅ All strategies stopped")
        logger.info("=" * 70)
    
    def _log_account_status(self):
        """Log current account status."""
        try:
            account = self.trading_client.get_account()
            equity = float(account.equity)
            cash = float(account.cash)
            
            positions = self.trading_client.get_all_positions()
            
            logger.info("\n📊 ACCOUNT STATUS")
            logger.info(f"   💰 Equity: ${equity:,.2f} | Cash: ${cash:,.2f}")
            logger.info(f"   📦 Positions: {len(positions)} open")
        except Exception as e:
            logger.error(f"Error getting account status: {e}")


async def main():
    """Main entry point."""
    # Parse STRATEGIES environment variable
    strategies_env = os.getenv('STRATEGIES', 'gemini-portfolio,sma')
    strategy_names = [s.strip() for s in strategies_env.split(',')]
    
    # Validate strategies
    for name in strategy_names:
        if not StrategyRegistry.is_registered(name):
            available = ', '.join(StrategyRegistry.list_strategies())
            logger.error(f"❌ Unknown strategy: '{name}'")
            logger.error(f"Available strategies: {available}")
            sys.exit(1)
    
    # Create bot runner
    bot = BotRunner(strategy_names)
    bot._validate_environment()
    
    # Setup signal handlers for graceful shutdown (Unix only)
    if sys.platform != 'win32':
        loop = asyncio.get_event_loop()
        
        def signal_handler():
            logger.info("\n🛑 Received shutdown signal (Ctrl+C)")
            asyncio.create_task(bot.shutdown())
        
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, signal_handler)
    
    # Load and run strategies
    await bot.load_strategies()
    
    try:
        await bot.run()
    except KeyboardInterrupt:
        logger.info("\n🛑 Received keyboard interrupt")
        await bot.shutdown()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n✅ Bot stopped")
