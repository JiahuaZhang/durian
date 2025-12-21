from typing import Dict, Type, TYPE_CHECKING

if TYPE_CHECKING:
    from .base_strategy import TradingStrategy
import logging

logger = logging.getLogger(__name__)


class StrategyRegistry:
    """
    Registry for trading strategies.
    
    Strategies register themselves with a unique name, then can be
    instantiated dynamically via create().
    """
    
    _strategies: Dict[str, Type["TradingStrategy"]] = {}
    
    @classmethod
    def register(cls, name: str, strategy_class: Type["TradingStrategy"]):
        """
        Register a strategy class with a unique name.
        
        Args:
            name: Strategy identifier (e.g., 'sma', 'gemini-portfolio')
            strategy_class: Strategy class (must inherit from TradingStrategy)
        """
        if name in cls._strategies:
            logger.warning(f"Strategy '{name}' is already registered. Overwriting.")
        
        cls._strategies[name] = strategy_class
        logger.info(f"✅ Registered strategy: {name} -> {strategy_class.__name__}")
    
    @classmethod
    def create(cls, name: str, **config) -> "TradingStrategy":
        """
        Create a strategy instance by name.
        
        Args:
            name: Strategy identifier
            **config: Configuration parameters for the strategy
        
        Returns:
            TradingStrategy: Instantiated strategy
        
        Raises:
            ValueError: If strategy name is not registered
        """
        if name not in cls._strategies:
            available = ', '.join(cls._strategies.keys())
            raise ValueError(
                f"Unknown strategy: '{name}'. "
                f"Available strategies: {available}"
            )
        
        strategy_class = cls._strategies[name]
        logger.info(f"Creating strategy: {name}")
        return strategy_class(**config)
    
    @classmethod
    def list_strategies(cls) -> list:
        """
        Get list of registered strategy names.
        
        Returns:
            list: Available strategy names
        """
        return list(cls._strategies.keys())
    
    @classmethod
    def is_registered(cls, name: str) -> bool:
        """
        Check if a strategy is registered.
        
        Args:
            name: Strategy identifier
        
        Returns:
            bool: True if strategy is registered
        """
        return name in cls._strategies
