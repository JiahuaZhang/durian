import os
import asyncio
import logging
from collections import deque
from typing import Dict, Any

from dotenv import load_dotenv
from alpaca.data.live import CryptoDataStream
from alpaca.data.models import Bar
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

from .base_strategy import TradingStrategy
from .registry import StrategyRegistry

logger = logging.getLogger(__name__)

load_dotenv()


class SMAStrategy(TradingStrategy):
    def __init__(self, **config):
        super().__init__(**config)
        
        self.symbol = config.get('symbol') or os.getenv('SMA_SYMBOL', 'BTC/USD')
        self.fast_period = int(config.get('fast_period') or os.getenv('SMA_FAST_PERIOD', '5'))
        self.slow_period = int(config.get('slow_period') or os.getenv('SMA_SLOW_PERIOD', '15'))
        self.trade_qty = float(config.get('trade_qty') or os.getenv('SMA_TRADE_QTY', '0.001'))
        
        self.prices = deque(maxlen=self.slow_period)
        self.position = None  # None or 'LONG'
        self.last_signal = None
        self.trade_count = 0
        self.initial_equity = None
        
        self.trading_client = None
        self.data_stream = None
        self._stream_task = None
        
        logger.info(f"SMA Strategy configured: {self.symbol}, Fast={self.fast_period}, Slow={self.slow_period}")
    
    def get_name(self) -> str:
        return "sma"
    
    def get_type(self) -> str:
        return "streaming"
    
    async def initialize(self):
        api_key = os.getenv("ALPACA_API_KEY")
        secret_key = os.getenv("ALPACA_SECRET_KEY")
        
        if not api_key or not secret_key:
            raise ValueError("ALPACA_API_KEY and ALPACA_SECRET_KEY environment variables required")
        
        self.trading_client = TradingClient(
            api_key=api_key,
            secret_key=secret_key,
            paper=True  # Paper trading
        )
        
        self.data_stream = CryptoDataStream(
            api_key=api_key,
            secret_key=secret_key
        )
        
        self.data_stream.subscribe_bars(self._handle_bar, self.symbol)
        
        account = self.trading_client.get_account()
        self.set_initial_equity(float(account.equity))
        
        logger.info(f"✅ SMA strategy initialized for {self.symbol}")
    
    def is_ready(self) -> bool:
        return self.trading_client is not None and self.data_stream is not None
    
    async def start(self):
        if not self.is_ready():
            raise RuntimeError("Strategy not initialized. Call initialize() first.")
        
        self.is_running = True
        logger.info(f"🚀 Starting SMA strategy stream for {self.symbol}")
        
        self._stream_task = asyncio.create_task(self.data_stream._run_forever())
        
        try:
            while self.is_running:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("SMA strategy cancelled")
            raise
        finally:
            if self._stream_task and not self._stream_task.done():
                self._stream_task.cancel()
                try:
                    await self._stream_task
                except asyncio.CancelledError:
                    pass
    
    async def stop(self):
        logger.info("Stopping SMA strategy...")
        self.is_running = False
        
        await asyncio.sleep(0.5)
        
        if self.data_stream:
            try:
                await self.data_stream._close()
            except Exception as e:
                logger.debug(f"Stream close error (expected): {e}")
        
        logger.info("✅ SMA strategy stopped")
    
    async def _handle_bar(self, bar: Bar):
        try:
            current_price = bar.close
            self.prices.append(current_price)
            
            if len(self.prices) < self.slow_period:
                logger.info(f"Warming up... {len(self.prices)}/{self.slow_period} bars")
                return
            
            fast_ma = self._calculate_ma(self.fast_period)
            slow_ma = self._calculate_ma(self.slow_period)
            
            signal = self._check_signal(fast_ma, slow_ma)
            
            if signal and self._should_execute_trade(signal):
                await self._execute_trade(signal, current_price)
        
        except Exception as e:
            logger.error(f"Error handling bar: {e}")
    
    def _calculate_ma(self, period: int) -> float:
        if len(self.prices) < period:
            return None
        return sum(list(self.prices)[-period:]) / period
    
    def _check_signal(self, fast_ma: float, slow_ma: float) -> str:
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
        if signal == "BUY" and self.position is None:
            return True
        elif signal == "SELL" and self.position == 'LONG':
            return True
        return False
    
    async def _execute_trade(self, signal: str, price: float):
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
            
            self.position = 'LONG' if signal == "BUY" else None
            self.trade_count += 1
            
        except Exception as e:
            logger.error(f"Error executing trade: {e}")
    
    def set_initial_equity(self, equity: float):
        if self.initial_equity is None:
            self.initial_equity = equity
            logger.info(f"Initial equity: ${equity:,.2f}")
    
    def get_stats(self) -> Dict[str, Any]:
        stats = {
            'strategy': self.get_name(),
            'symbol': self.symbol,
            'trade_count': self.trade_count,
            'position': self.position,
            'bars_collected': len(self.prices),
            'ready': len(self.prices) >= self.slow_period
        }
        
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


StrategyRegistry.register('sma', SMAStrategy)

async def main():
    strategy = SMAStrategy()
    
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
