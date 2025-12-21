import os
import logging
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import json

from google import genai
from google.genai import types
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest, GetAssetsRequest
from alpaca.trading.enums import OrderSide, TimeInForce, AssetClass, AssetStatus
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockLatestQuoteRequest, StockBarsRequest
from alpaca.data.timeframe import TimeFrame

logger = logging.getLogger(__name__)


@dataclass
class AssetScore:
    symbol: str
    score: float  # 0-100
    reasoning: str
    sector: str = ""


@dataclass
class PortfolioAllocation:
    allocations: Dict[str, float]
    reasoning: str
    rebalance_required: bool


class GeminiAnalyzer:
    # models/gemini-2.5-flash
    # models/gemini-2.5-pro
    # gemini-3-pro-preview
    # gemini-3-flash-preview
    def __init__(self, api_key: str, model: str = "gemini-3-flash-preview"):
        self.client = genai.Client(api_key=api_key)
        self.model = model
        logger.info(f"✅ Gemini AI initialized with model: {model}")
    
    def test_connection(self) -> bool:
        """Test Gemini API connection."""
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents="Say 'OK' if you can read this."
            )
            return "ok" in response.text.lower()
        except Exception as e:
            logger.error(f"❌ Gemini connection test failed: {e}")
            return False
    
    def analyze_market_conditions(self) -> str:
        """
        Generate comprehensive macro-economic analysis.
        
        Returns AI-generated market analysis covering:
        - Economic indicators and trends
        - Global events affecting markets
        - Sector outlooks
        """
        prompt = """You are an expert financial analyst. Provide a comprehensive market analysis covering:

1. **Current Economic Environment** (2-3 sentences)
   - Key economic indicators (interest rates, inflation, GDP trends)
   - Overall market sentiment

2. **Global Events Impact** (2-3 sentences)
   - Major geopolitical events affecting markets
   - Sector-specific impacts

3. **Sector Outlook** (2-3 sentences)
   - Which sectors look promising
   - Which sectors face headwinds

Keep it concise and actionable. Focus on facts that would influence stock selection TODAY.
Current date: """ + datetime.now().strftime("%Y-%m-%d")
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            analysis = response.text
            logger.info("✅ Generated macro market analysis")
            return analysis
        except Exception as e:
            logger.error(f"❌ Error generating market analysis: {e}")
            return "Unable to generate market analysis at this time."
    
    def score_assets_batch(
        self,
        symbols: List[str],
        market_analysis: str,
        batch_size: int = 10
    ) -> List[AssetScore]:
        """
        Score multiple assets in batches to reduce API calls.
        
        Args:
            symbols: List of stock tickers to score
            market_analysis: Macro economic context
            batch_size: Number of assets to score per API call
        
        Returns List of AssetScore objects
        """
        import time
        
        all_scores = []
        
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i+batch_size]
            
            # Create batch scoring prompt
            symbols_str = ", ".join(batch)
            prompt = f"""You are an expert stock analyst. Score these {len(batch)} stocks from 0-100.

**Stocks to analyze:** {symbols_str}

**Current Market Context:**
{market_analysis}

**Scoring Criteria:**
- Fundamental strength
- Technical momentum
- Alignment with market conditions
- Sector positioning

**Output Format (JSON array):**
[
  {{"symbol": "TICKER1", "score": <0-100>, "reasoning": "<brief reason>", "sector": "<sector>"}},
  {{"symbol": "TICKER2", "score": <0-100>, "reasoning": "<brief reason>", "sector": "<sector>"}},
  ...
]

Provide ONLY the JSON array, no other text. If you cannot analyze a stock, give it score 50."""

            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt
                )
                result_text = response.text.strip()
                
                # Clean markdown
                if "```json" in result_text:
                    result_text = result_text.split("```json")[1].split("```")[0].strip()
                elif "```" in result_text:
                    result_text = result_text.split("```")[1].split("```")[0].strip()
                
                results = json.loads(result_text)
                
                # Convert to AssetScore objects
                for result in results:
                    all_scores.append(AssetScore(
                        symbol=result["symbol"],
                        score=float(result["score"]),
                        reasoning=result["reasoning"],
                        sector=result.get("sector", "Unknown")
                    ))
                
                logger.info(f"   ✅ Scored batch {i//batch_size + 1}: {len(results)} assets")
                
                # Rate limiting: wait briefly between batches
                if i + batch_size < len(symbols):
                    time.sleep(2)  # 2 second delay between batches
                    
            except Exception as e:
                logger.error(f"❌ Error scoring batch {batch}: {e}")
                # Add neutral scores for failed batch
                for symbol in batch:
                    all_scores.append(AssetScore(
                        symbol=symbol,
                        score=50.0,
                        reasoning=f"Error during batch analysis",
                        sector="Unknown"
                    ))
        
        return all_scores
    
    def score_asset(
        self,
        symbol: str,
        company_info: Dict,
        market_analysis: str
    ) -> AssetScore:
        """
        Score an individual asset using AI analysis.
        
        Args:
            symbol: Stock ticker
            company_info: Company fundamentals and recent data
            market_analysis: Macro economic context
        
        Returns AssetScore with 0-100 rating
        """
        prompt = f"""You are an expert stock analyst. Score this stock from 0-100 based on the information provided.

**Stock:** {symbol}
**Company Info:**
{json.dumps(company_info, indent=2)}

**Current Market Context:**
{market_analysis}

**Scoring Criteria:**
- Fundamental strength (financial metrics)
- Technical momentum (price action)
- Alignment with market conditions
- Sector positioning

**Output Format (JSON):**
{{
    "score": <number 0-100>,
    "reasoning": "<2-3 sentence explanation>",
    "sector": "<sector name>"
}}

Provide ONLY the JSON, no other text."""

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            # Clean response and parse JSON
            result_text = response.text.strip()
            # Remove markdown code blocks if present
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(result_text)
            
            return AssetScore(
                symbol=symbol,
                score=float(result["score"]),
                reasoning=result["reasoning"],
                sector=result.get("sector", "Unknown")
            )
        except Exception as e:
            logger.error(f"❌ Error scoring {symbol}: {e}")
            # Return neutral score on error
            return AssetScore(
                symbol=symbol,
                score=50.0,
                reasoning=f"Error during analysis: {str(e)[:100]}",
                sector="Unknown"
            )
    
    def determine_allocation(
        self,
        scored_assets: List[AssetScore],
        target_count: int,
        market_analysis: str,
        current_positions: Dict[str, float]
    ) -> PortfolioAllocation:
        """
        Use AI to determine optimal portfolio allocation.
        
        Args:
            scored_assets: List of scored assets
            target_count: Number of assets to hold (e.g., 15)
            market_analysis: Current market context
            current_positions: Current portfolio positions {symbol: weight}
        
        Returns PortfolioAllocation with weights for each asset
        """
        # Get top N assets by score
        top_assets = sorted(scored_assets, key=lambda x: x.score, reverse=True)[:target_count]
        
        assets_info = "\n".join([
            f"- {a.symbol} (Score: {a.score:.1f}, Sector: {a.sector}): {a.reasoning}"
            for a in top_assets
        ])
        
        current_info = json.dumps(current_positions, indent=2) if current_positions else "Empty portfolio"
        
        prompt = f"""You are a portfolio manager. Determine optimal allocation weights for these {target_count} stocks.

**Top Scored Assets:**
{assets_info}

**Current Portfolio:**
{current_info}

**Market Context:**
{market_analysis}

**Requirements:**
1. Allocate across all {target_count} stocks
2. Weights must sum to 1.0 (100%)
3. Consider sector diversification
4. Each position: 3-15% of portfolio
5. Minimize unnecessary trading (favor current positions if scores are similar)

**Output Format (JSON):**
{{
    "allocations": {{
        "SYMBOL1": 0.XX,
        "SYMBOL2": 0.XX,
        ...
    }},
    "reasoning": "<2-3 sentences explaining allocation strategy>",
    "rebalance_required": true/false
}}

Provide ONLY the JSON, no other text."""

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            result_text = response.text.strip()
            
            # Clean markdown
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(result_text)
            
            # Normalize weights to ensure they sum to 1.0
            allocations = result["allocations"]
            total = sum(allocations.values())
            normalized = {k: v/total for k, v in allocations.items()}
            
            return PortfolioAllocation(
                allocations=normalized,
                reasoning=result["reasoning"],
                rebalance_required=result.get("rebalance_required", True)
            )
        except Exception as e:
            logger.error(f"❌ Error determining allocation: {e}")
            # Fallback: equal weight distribution
            equal_weight = 1.0 / target_count
            return PortfolioAllocation(
                allocations={a.symbol: equal_weight for a in top_assets},
                reasoning=f"Equal weight fallback due to error: {str(e)[:100]}",
                rebalance_required=True
            )


class AIPortfolioStrategy:
    """Main AI-powered portfolio strategy orchestrator."""
    
    def __init__(
        self,
        alpaca_key: str,
        alpaca_secret: str,
        gemini_key: str,
        portfolio_size: int = 15,
        asset_universe: Optional[List[str]] = None
    ):
        self.trading_client = TradingClient(
            api_key=alpaca_key,
            secret_key=alpaca_secret,
            paper=True
        )
        self.data_client = StockHistoricalDataClient(
            api_key=alpaca_key,
            secret_key=alpaca_secret
        )
        self.analyzer = GeminiAnalyzer(gemini_key)
        self.portfolio_size = portfolio_size
        self.asset_universe = asset_universe or self._get_sp500_top100()
        
        logger.info(f"✅ AI Portfolio Strategy initialized")
        logger.info(f"   Portfolio size: {portfolio_size} assets")
        logger.info(f"   Asset universe: {len(self.asset_universe)} symbols")
    
    def _get_sp500_top100(self) -> List[str]:
        """Get top 100 S&P 500 stocks by market cap (simplified)."""
        # Top 100 S&P 500 tickers (you can expand/customize this)
        return [
            "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "UNH", "LLY",
            "XOM", "JPM", "V", "JNJ", "AVGO", "PG", "MA", "HD", "CVX", "MRK",
            "ABBV", "COST", "PEP", "KO", "ADBE", "WMT", "CRM", "MCD", "CSCO", "ACN",
            "TMO", "ABT", "LIN", "NFLX", "AMD", "NKE", "DHR", "VZ", "TXN", "INTC",
            "ORCL", "PM", "QCOM", "DIS", "UPS", "INTU", "CMCSA", "NEE", "AMGN", "HON",
            "IBM", "RTX", "SPGI", "LOW", "BA", "CAT", "SBUX", "GE", "AMAT", "MS",
            "ELV", "PLD", "BMY", "DE", "GS", "BKNG", "C", "GILD", "MDT", "BLK",
            "ADI", "ADP", "MDLZ", "AMT", "VRTX", "SYK", "MMC", "SCHW", "TJX", "ISRG",
            "REGN", "ZTS", "PGR", "CB", "CI", "NOW", "LRCX", "TMUS", "MO", "SO",
            "NOC", "BSX", "SLB", "BDX", "DUK", "PNC", "ETN", "EOG", "USB", "APH"
        ]
    
    def get_company_info(self, symbol: str) -> Dict:
        """Fetch recent company data for analysis."""
        try:
            # Get latest quote
            quote_request = StockLatestQuoteRequest(symbol_or_symbols=symbol)
            quotes = self.data_client.get_stock_latest_quote(quote_request)
            
            if symbol in quotes:
                quote = quotes[symbol]
                return {
                    "symbol": symbol,
                    "latest_price": float(quote.ask_price),
                    "bid_ask_spread": float(quote.ask_price - quote.bid_price),
                    "timestamp": quote.timestamp.isoformat()
                }
            else:
                return {"symbol": symbol, "error": "No quote data"}
        except Exception as e:
            logger.warning(f"Could not fetch data for {symbol}: {e}")
            return {"symbol": symbol, "error": str(e)}
    
    def get_current_positions(self) -> Dict[str, float]:
        """Get current portfolio positions as {symbol: weight}."""
        try:
            account = self.trading_client.get_account()
            total_equity = float(account.equity)
            
            if total_equity == 0:
                return {}
            
            positions = self.trading_client.get_all_positions()
            position_weights = {}
            
            for pos in positions:
                market_value = float(pos.market_value)
                weight = market_value / total_equity
                position_weights[pos.symbol] = weight
            
            return position_weights
        except Exception as e:
            logger.error(f"Error getting positions: {e}")
            return {}
    
    def run_analysis(self) -> Tuple[str, List[AssetScore], PortfolioAllocation]:
        """
        Run complete portfolio analysis.
        
        Returns:
            (market_analysis, scored_assets, allocation)
        """
        logger.info("🔍 Starting AI portfolio analysis...")
        
        # Step 1: Macro analysis
        logger.info("📊 Step 1/3: Analyzing market conditions...")
        market_analysis = self.analyzer.analyze_market_conditions()
        
        # Step 2: Score assets in batches (more efficient)
        logger.info(f"📈 Step 2/3: Scoring {len(self.asset_universe)} assets in batches...")
        scored_assets = self.analyzer.score_assets_batch(
            self.asset_universe,
            market_analysis,
            batch_size=10  # Score 10 assets per API call
        )
        
        logger.info(f"✅ Scored {len(scored_assets)} assets")
        
        # Step 3: Determine allocation
        logger.info(f"💼 Step 3/3: Determining portfolio allocation...")
        current_positions = self.get_current_positions()
        allocation = self.analyzer.determine_allocation(
            scored_assets,
            self.portfolio_size,
            market_analysis,
            current_positions
        )
        
        logger.info("✅ AI analysis complete")
        return market_analysis, scored_assets, allocation


if __name__ == "__main__":
    # Test mode
    from dotenv import load_dotenv
    load_dotenv()
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    strategy = AIPortfolioStrategy(
        alpaca_key=os.getenv("ALPACA_API_KEY"),
        alpaca_secret=os.getenv("ALPACA_SECRET_KEY"),
        gemini_key=os.getenv("GEMINI_API_KEY"),
        portfolio_size=15
    )
    
    # Test Gemini connection
    if strategy.analyzer.test_connection():
        logger.info("✅ Gemini connection successful")
    
    # Run dry-run analysis
    logger.info("\n" + "="*60)
    logger.info("🧪 DRY RUN MODE - No trades will be executed")
    logger.info("="*60 + "\n")
    
    market_analysis, scores, allocation = strategy.run_analysis()
    
    # Display results
    print("\n" + "="*60)
    print("📊 MARKET ANALYSIS")
    print("="*60)
    print(market_analysis)
    
    print("\n" + "="*60)
    print(f"📈 TOP {strategy.portfolio_size} ASSETS")
    print("="*60)
    top_scores = sorted(scores, key=lambda x: x.score, reverse=True)[:strategy.portfolio_size]
    for i, score in enumerate(top_scores, 1):
        print(f"{i:2d}. {score.symbol:6s} | Score: {score.score:5.1f} | {score.sector:20s}")
        print(f"    {score.reasoning}")
    
    print("\n" + "="*60)
    print("💼 RECOMMENDED ALLOCATION")
    print("="*60)
    for symbol, weight in sorted(allocation.allocations.items(), key=lambda x: x[1], reverse=True):
        print(f"{symbol:6s}: {weight*100:5.1f}%")
    print(f"\nReasoning: {allocation.reasoning}")
    print(f"Rebalance Required: {allocation.rebalance_required}")
