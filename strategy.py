"""
Trading Strategy Module for BTC/USD

Implements a Simple Moving Average Crossover strategy.
"""

from collections import deque
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class SimpleMAStrategy:
    """
    Simple Moving Average Crossover Strategy for BTC/USD.
    
    Strategy:
    - BUY when fast MA crosses above slow MA (bullish signal)
    - SELL when fast pMA crosses below slow MA (bearish signal)
    
    Parameters:
    -----------
    fast_period : int
        Fast moving average period (e.g., 5 minutes)
    slow_period : int
        Slow moving average period (e.g., 15 minutes)
    trade_qty : float
        Amount of BTC to trade per order
    """
    
    def __init__(self, fast_period=5, slow_period=15, trade_qty=0.001):
        self.fast_period = fast_period
        self.slow_period = slow_period
        self.trade_qty = trade_qty
        
        self.prices = deque(maxlen=slow_period)
        self.position = None  # None or 'LONG'
        self.last_signal = None
        self.trade_count = 0
        self.initial_equity = None
        
        logger.info(f"Strategy initialized: Fast MA={fast_period}, Slow MA={slow_period}, Qty={trade_qty}")
    
    def add_price(self, price):
        """Add new price to the price history."""
        self.prices.append(price)
    
    def calculate_ma(self, period):
        """Calculate moving average for given period."""
        if len(self.prices) < period:
            return None
        return sum(list(self.prices)[-period:]) / period
    
    def is_ready(self):
        """Check if strategy has enough data to generate signals."""
        return len(self.prices) >= self.slow_period
    
    def get_current_mas(self):
        """Get current fast and slow moving averages."""
        if not self.is_ready():
            return None, None
        return self.calculate_ma(self.fast_period), self.calculate_ma(self.slow_period)
    
    def check_signal(self):
        """
        Check for trading signals.
        
        Returns:
        --------
        tuple or None
            (signal_type, fast_ma, slow_ma) if signal detected, None otherwise
            signal_type is either "BUY" or "SELL"
        """
        if not self.is_ready():
            return None
        
        fast_ma = self.calculate_ma(self.fast_period)
        slow_ma = self.calculate_ma(self.slow_period)
        
        # Determine signal
        if fast_ma > slow_ma and self.last_signal != "BUY":
            self.last_signal = "BUY"
            logger.info(f"📈 BULLISH CROSSOVER: Fast MA ${fast_ma:,.2f} > Slow MA ${slow_ma:,.2f}")
            return "BUY", fast_ma, slow_ma
        elif fast_ma < slow_ma and self.last_signal != "SELL":
            self.last_signal = "SELL"
            logger.info(f"📉 BEARISH CROSSOVER: Fast MA ${fast_ma:,.2f} < Slow MA ${slow_ma:,.2f}")
            return "SELL", fast_ma, slow_ma
        
        return None
    
    def should_execute_trade(self, signal_type):
        """
        Determine if a trade should be executed based on current position.
        
        Parameters:
        -----------
        signal_type : str
            Either "BUY" or "SELL"
        
        Returns:
        --------
        bool
            True if trade should be executed
        """
        if signal_type == "BUY" and self.position is None:
            return True
        elif signal_type == "SELL" and self.position == 'LONG':
            return True
        return False
    
    def update_position(self, new_position):
        """Update current position state."""
        self.position = new_position
        logger.info(f"Position updated: {new_position}")
    
    def increment_trade_count(self):
        """Increment the trade counter."""
        self.trade_count += 1
    
    def set_initial_equity(self, equity):
        """Set initial equity for P&L calculations."""
        if self.initial_equity is None:
            self.initial_equity = equity
            logger.info(f"Initial equity set: ${equity:,.2f}")
    
    def calculate_pnl(self, current_equity):
        """Calculate profit/loss vs initial equity."""
        if self.initial_equity is None:
            return 0, 0
        pnl = current_equity - self.initial_equity
        pnl_pct = (pnl / self.initial_equity) * 100 if self.initial_equity > 0 else 0
        return pnl, pnl_pct
    
    def get_stats(self):
        """Get strategy statistics."""
        return {
            'trade_count': self.trade_count,
            'position': self.position,
            'bars_collected': len(self.prices),
            'ready': self.is_ready()
        }
