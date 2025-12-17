"""
SMA Crossover Strategy

Real-time streaming strategy that trades BTC/USD based on moving average crossovers.
"""

import os
import asyncio
import logging
from collections import deque
from typing import Dict, Any

from alpaca.data.live import CryptoDataStream
from alpaca.data.models import Bar
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

from .base_strategy import TradingStrategy
from .registry import StrategyRegistry

logger = logging.getLogger(__name__)


class SMAStrategy(TradingStrategy):
    """Simple Moving Average Crossover Strategy for BTC/USD."""
    
    def __init__(self, **config):
        super().__init__(**config)
        
        # Configuration
        self.symbol = config.get('symbol', 'BTC/USD')
        self.fast_period = config.get('fast_period', 5)
        self.slow_period = config.get('slow_period', 15)
        self.trade_qty = config.get('trade_qty', 0.001)
        
        # State
        self.prices = deque(maxlen=self.slow_period)
        self.position = None  # None or 'LONG'
        self.last_signal = None
        self.trade_count = 0
        self.initial_equity = None
        
        # WebSocket stream
        self.data_stream = None
        self._stream_task = None
        
        logger.info(f"SMA Strategy configured: {self.symbol}, Fast={self.fast_period}, Slow={self.slow_period}")
    
    def get_name(self) -> str:
        return "sma"
    
    def get_type(self) -> str:
        return "streaming"
    
    async def initialize(self, trading_client: TradingClient, **kwargs):
        """Initialize with trading client and data stream."""
        self.trading_client = trading_client
        
        # Get API credentials from environment
        api_key = os.getenv("ALPACA_API_KEY")
        secret_key = os.getenv("ALPACA_SECRET_KEY")
        
        # Create data stream
        self.data_stream = CryptoDataStream(
            api_key=api_key,
            secret_key=secret_key
        )
        
        # Subscribe to minute bars
        self.data_stream.subscribe_bars(self._handle_bar, self.symbol)
        
        # Set initial equity
        account = self.trading_client.get_account()
        self.set_initial_equity(float(account.equity))
        
        logger.info(f"✅ SMA strategy initialized for {self.symbol}")
    
    async def start(self):
        """Start the WebSocket data stream."""
        if not self.is_ready():
            raise RuntimeError("Strategy not initialized. Call initialize() first.")
        
        self.is_running = True
        logger.info(f"🚀 Starting SMA strategy stream for {self.symbol}")
        
        # Create and run the stream task
        self._stream_task = asyncio.create_task(self.data_stream._run_forever())
        
        # Keep strategy alive until cancelled
        try:
            while self.is_running:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("SMA strategy cancelled")
            raise
        finally:
            # Cleanup stream task
            if self._stream_task and not self._stream_task.done():
                self._stream_task.cancel()
                try:
                    await self._stream_task
                except asyncio.CancelledError:
                    pass
    
    async def stop(self):
        """Stop the data stream and cleanup."""
        logger.info("Stopping SMA strategy...")
        self.is_running = False
        
        # Give the strategy loop time to exit
        await asyncio.sleep(0.5)
        
        # Close the stream
        if self.data_stream:
            try:
                await self.data_stream._close()
            except Exception as e:
                logger.debug(f"Stream close error (expected): {e}")
        
        logger.info("✅ SMA strategy stopped")
    
    async def _handle_bar(self, bar: Bar):
        """Handle incoming minute bar data."""
        try:
            current_price = bar.close
            self.prices.append(current_price)
            
            # Check if we have enough data
            if len(self.prices) < self.slow_period:
                logger.info(f"Warming up... {len(self.prices)}/{self.slow_period} bars")
                return
            
            # Calculate MAs
            fast_ma = self._calculate_ma(self.fast_period)
            slow_ma = self._calculate_ma(self.slow_period)
            
            # Check for signals
            signal = self._check_signal(fast_ma, slow_ma)
            
            if signal and self._should_execute_trade(signal):
                await self._execute_trade(signal, current_price)
        
        except Exception as e:
            logger.error(f"Error handling bar: {e}")
    
    def _calculate_ma(self, period: int) -> float:
        """Calculate moving average for given period."""
        if len(self.prices) < period:
            return None
        return sum(list(self.prices)[-period:]) / period
    
    def _check_signal(self, fast_ma: float, slow_ma: float) -> str:
        """Check for trading signals."""
        if fast_ma > slow_ma and self.last_signal != "BUY":
            self.last_signal = "BUY"
            logger.info(f"📈 BULLISH CROSSOVER: Fast ${fast_ma:,.2f} > Slow ${slow_ma:,.2f}")
            return "BUY"
        elif fast_ma < slow_ma and self.last_signal != "SELL":
            self.last_signal = "SELL"
            logger.info(f"📉 BEARISH CROSSOVER: Fast ${fast_ma:,.2f} < Slow ${slow_ma:,.2f}")
            return "SELL"
        return None
    
    def _should_execute_trade(self, signal: str) -> bool:
        """Determine if trade should be executed."""
        if signal == "BUY" and self.position is None:
            return True
        elif signal == "SELL" and self.position == 'LONG':
            return True
        return False
    
    async def _execute_trade(self, signal: str, price: float):
        """Execute trade based on signal."""
        try:
            side = OrderSide.BUY if signal == "BUY" else OrderSide.SELL
            
            order_request = MarketOrderRequest(
                symbol=self.symbol,
                qty=self.trade_qty,
                side=side,
                time_in_force=TimeInForce.GTC
            )
            
            order = self.trading_client.submit_order(order_data=order_request)
            
            logger.info(f"{'🟢 BUY' if signal == 'BUY' else '🔴 SELL'} order submitted: {order.id}")
            
            # Update position
            self.position = 'LONG' if signal == "BUY" else None
            self.trade_count += 1
            
        except Exception as e:
            logger.error(f"Error executing trade: {e}")
    
    def set_initial_equity(self, equity: float):
        """Set initial equity for P&L tracking."""
        if self.initial_equity is None:
            self.initial_equity = equity
            logger.info(f"Initial equity: ${equity:,.2f}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get strategy statistics."""
        stats = {
            'strategy': self.get_name(),
            'symbol': self.symbol,
            'trade_count': self.trade_count,
            'position': self.position,
            'bars_collected': len(self.prices),
            'ready': len(self.prices) >= self.slow_period
        }
        
        # Add P&L if we have trading client
        if self.trading_client and self.initial_equity:
            try:
                account = self.trading_client.get_account()
                current_equity = float(account.equity)
                pnl = current_equity - self.initial_equity
                pnl_pct = (pnl / self.initial_equity) * 100
                
                stats['current_equity'] = current_equity
                stats['initial_equity'] = self.initial_equity
                stats['pnl'] = pnl
                stats['pnl_pct'] = pnl_pct
            except:
                pass
        
        return stats


# Register strategy
StrategyRegistry.register('sma', SMAStrategy)
