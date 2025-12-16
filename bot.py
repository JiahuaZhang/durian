"""
Durian Invest - BTC/USD Trading Bot

A production-ready cryptocurrency trading bot using Alpaca's paper trading API.
Implements a Simple Moving Average Crossover strategy on 1-minute BTC/USD data.
"""

import os
import sys
import logging
import asyncio
from datetime import datetime
from dotenv import load_dotenv

from alpaca.data.live import CryptoDataStream
from alpaca.data.models import Bar
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce, OrderStatus
from alpaca.common.exceptions import APIError

from strategy import SimpleMAStrategy

# Load environment variables
load_dotenv()

# ============================================================
# Configuration
# ============================================================

SYMBOL = "BTC/USD"
FAST_PERIOD = 5  # 5-minute fast MA
SLOW_PERIOD = 15  # 15-minute slow MA
TRADE_QTY = 0.001  # 0.001 BTC per trade
STATUS_UPDATE_INTERVAL = 15  # Show account status every 15 minutes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ============================================================
# Trading Bot Class
# ============================================================

class DurianTradingBot:
    """Main trading bot orchestrator."""
    
    def __init__(self):
        # Validate environment variables
        self.api_key = os.getenv("ALPACA_API_KEY")
        self.secret_key = os.getenv("ALPACA_SECRET_KEY")
        
        if not self.api_key or not self.secret_key:
            logger.error("❌ ALPACA_API_KEY and ALPACA_SECRET_KEY must be set!")
            sys.exit(1)
        
        # Initialize clients
        self.trading_client = TradingClient(
            api_key=self.api_key,
            secret_key=self.secret_key,
            paper=True  # PAPER TRADING
        )
        
        self.data_stream = CryptoDataStream(
            api_key=self.api_key,
            secret_key=self.secret_key
        )
        
        # Initialize strategy
        self.strategy = SimpleMAStrategy(
            fast_period=FAST_PERIOD,
            slow_period=SLOW_PERIOD,
            trade_qty=TRADE_QTY
        )
        
        # Get local timezone
        self.local_tz = datetime.now().astimezone().tzinfo
        
        logger.info("✅ Trading bot initialized successfully")
    
    async def handle_bar(self, bar: Bar):
        """
        Handle incoming minute bar data.
        
        This is called every minute with new BTC/USD data.
        """
        try:
            local_time = bar.timestamp.astimezone(self.local_tz)
            current_price = bar.close
            
            # Add price to strategy
            self.strategy.add_price(current_price)
            
            # Log bar data
            logger.info(f"📊 {local_time.strftime('%Y-%m-%d %I:%M:%S %p')} | "
                       f"BTC/USD: ${current_price:,.2f} | "
                       f"Vol: {bar.volume:.8f}")
            
            # Check if strategy is ready
            if not self.strategy.is_ready():
                logger.info(f"   ⏳ Warming up... ({len(self.strategy.prices)}/{SLOW_PERIOD} bars)")
                return
            
            # Get current MAs
            fast_ma, slow_ma = self.strategy.get_current_mas()
            
            # Check for signal
            signal = self.strategy.check_signal()
            
            if signal:
                signal_type, fast_ma, slow_ma = signal
                
                # Check if we should execute this trade
                if self.strategy.should_execute_trade(signal_type):
                    await self.execute_trade(signal_type, current_price, fast_ma, slow_ma)
                else:
                    logger.info(f"   ⚠️  {signal_type} signal, but no action "
                              f"(already {'flat' if self.strategy.position is None else 'in position'})")
            
            # Update account status periodically
            if local_time.minute % STATUS_UPDATE_INTERVAL == 0:
                self.log_account_status()
                
        except Exception as e:
            logger.error(f"❌ Error handling bar: {e}", exc_info=True)
    
    async def execute_trade(self, side, price, fast_ma, slow_ma):
        """Execute a trade order."""
        try:
            logger.info(f"{'🟢' if side == 'BUY' else '🔴'} Executing {side} order...")
            
            # Create order
            order_request = MarketOrderRequest(
                symbol=SYMBOL,
                qty=TRADE_QTY,
                side=OrderSide.BUY if side == "BUY" else OrderSide.SELL,
                time_in_force=TimeInForce.GTC
            )
            
            # Submit order
            order = self.trading_client.submit_order(order_data=order_request)
            self.strategy.increment_trade_count()
            
            logger.info(f"✅ Order submitted: ID={order.id[:12]}...")
            logger.info(f"   Fast MA: ${fast_ma:,.2f} | Slow MA: ${slow_ma:,.2f}")
            logger.info(f"   Qty: {TRADE_QTY} BTC | Est. Value: ${price * TRADE_QTY:,.2f}")
            
            # Update position
            new_position = 'LONG' if side == "BUY" else None
            self.strategy.update_position(new_position)
            
            # Check order fill status
            asyncio.create_task(self.check_order_fill(order.id))
            
        except APIError as e:
            logger.error(f"❌ API Error placing order: {e}")
        except Exception as e:
            logger.error(f"❌ Unexpected error placing order: {e}", exc_info=True)
    
    async def check_order_fill(self, order_id):
        """Check if order was filled."""
        await asyncio.sleep(5)
        
        try:
            order = self.trading_client.get_order_by_id(order_id)
            
            if order.status == OrderStatus.FILLED:
                logger.info(f"✅ Order {order_id[:12]}... FILLED at ${float(order.filled_avg_price):,.2f}")
            else:
                logger.warning(f"⏳ Order {order_id[:12]}... status: {order.status}")
                
        except Exception as e:
            logger.error(f"❌ Error checking order status: {e}")
    
    def log_account_status(self):
        """Log current account status."""
        try:
            account = self.trading_client.get_account()
            equity = float(account.equity)
            cash = float(account.cash)
            
            # Set initial equity if not set
            self.strategy.set_initial_equity(equity)
            
            # Calculate P&L
            pnl, pnl_pct = self.strategy.calculate_pnl(equity)
            
            logger.info("=" * 60)
            logger.info("📊 ACCOUNT STATUS")
            logger.info(f"   💰 Equity: ${equity:,.2f} | Cash: ${cash:,.2f}")
            logger.info(f"   📈 P&L: ${pnl:+,.2f} ({pnl_pct:+.2f}%)")
            logger.info(f"   🔢 Trades: {self.strategy.trade_count}")
            
            # Check position
            try:
                position = self.trading_client.get_open_position(SYMBOL)
                qty = float(position.qty)
                market_value = float(position.market_value)
                unrealized_pl = float(position.unrealized_pl)
                unrealized_plpc = float(position.unrealized_plpc) * 100
                
                logger.info(f"   📦 Position: {qty:.8f} BTC (${market_value:,.2f})")
                logger.info(f"   💹 Unrealized P&L: ${unrealized_pl:+,.2f} ({unrealized_plpc:+.2f}%)")
                
            except Exception:
                logger.info(f"   📦 No open position")
            
            logger.info("=" * 60)
            
        except Exception as e:
            logger.error(f"❌ Error getting account status: {e}")
    
    def start(self):
        """Start the trading bot."""
        logger.info("=" * 60)
        logger.info("🚀 DURIAN INVEST - BTC/USD TRADING BOT")
        logger.info("=" * 60)
        logger.info(f"   Strategy: MA Crossover ({FAST_PERIOD}/{SLOW_PERIOD})")
        logger.info(f"   Symbol: {SYMBOL}")
        logger.info(f"   Trade Size: {TRADE_QTY} BTC")
        logger.info(f"   Mode: PAPER TRADING")
        logger.info("=" * 60)
        
        # Show initial account status
        self.log_account_status()
        
        # Subscribe to bars
        self.data_stream.subscribe_bars(self.handle_bar, SYMBOL)
        
        logger.info(f"📡 Starting live stream for {SYMBOL}...")
        logger.info(f"💡 Strategy will activate after {SLOW_PERIOD} minutes")
        logger.info("🛑 Press Ctrl+C to stop")
        logger.info("")
        
        try:
            self.data_stream.run()
        except KeyboardInterrupt:
            logger.info("\n🛑 Shutdown signal received")
            self.shutdown()
        except Exception as e:
            logger.error(f"❌ Fatal error: {e}", exc_info=True)
            self.shutdown()
    
    def shutdown(self):
        """Graceful shutdown."""
        logger.info("🔄 Shutting down bot...")
        logger.info("📊 Final account status:")
        self.log_account_status()
        logger.info("✅ Bot stopped successfully")
        sys.exit(0)


# ============================================================
# Main Entry Point
# ============================================================

if __name__ == "__main__":
    bot = DurianTradingBot()
    bot.start()
