import requests
import os
from django.utils import timezone
from datetime import timedelta
from django.db import models, connection
from .models import StockData
from datetime import datetime

import dotenv
from dotenv import load_dotenv
load_dotenv()
import dotenv

class PolygonAPIService:
    """Service class for handling Polygon.io API interactions"""
    
    def __init__(self):
        self.api_key = os.getenv('POLYGON_API_KEY')
        if not self.api_key:
            raise ValueError("POLYGON_API_KEY environment variable is not set")
    
    def get_ticker_info(self, ticker):
        """Fetch ticker information from Polygon.io"""
        url = f"https://api.polygon.io/v3/reference/tickers/{ticker}"
        params = {"apikey": self.api_key}
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_previous_close(self, ticker):
        """Fetch previous close price and volume from Polygon.io"""
        url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/prev"
        params = {"apikey": self.api_key}
        
        response = requests.get(url, params=params)
        if response.status_code == 200:
            return response.json()
        return {}
    
    def get_daily_ohlc(self, ticker):
        """
        Fetch today's OHLC data from Polygon.io using daily open-close endpoint.
        Falls back to previous day if today's data is not available.
        """
        # Try to get today's data first
        today = datetime.now().date().strftime('%Y-%m-%d')
        url = f"https://api.polygon.io/v1/open-close/{ticker}/{today}"
        params = {
            "adjusted": "true",
            "apikey": self.api_key
        }
        
        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                # Check if we got valid data
                if data.get("status") == "OK" and data.get("open") is not None:
                    # Convert to format consistent with aggregates endpoint
                    return {
                        "results": [{
                            "o": data.get("open"),
                            "h": data.get("high"),
                            "l": data.get("low"),
                            "c": data.get("close"),
                            "v": data.get("volume", 0)
                        }]
                    }
        except Exception:
            pass  # Fall through to previous day
        
        # Fallback to previous day's data
        return self.get_previous_close(ticker)
    
    def search_tickers(self, query):
        """Search for tickers by company name using Polygon.io"""
        url = "https://api.polygon.io/v3/reference/tickers"
        params = {
            "apikey": self.api_key,
            "search": query,
            "active": "true",
            "limit": 10
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    

    def get_historical_prices(self, ticker, from_date, to_date):
        """
        Fetch historical price data using Polygon.io custom bars endpoint.
        Example: https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2023-01-01/2023-01-10
        """
        url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{from_date}/{to_date}"
        params = {
            "adjusted": "true",
            "sort": "asc",
            "limit": 120,
            "apiKey": self.api_key
        }

        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_financials(self, ticker, limit=4, timeframe='quarterly'):
        """
        Fetch comprehensive financial data from Polygon.io (Deprecated endpoint but included in Basic plan).
        This includes balance sheet, cash flow statement, income statement, and comprehensive income.
        
        Args:
            ticker: Stock ticker symbol
            limit: Number of periods to retrieve (default: 4)
            timeframe: 'quarterly' or 'annual' (default: 'quarterly')
        
        Returns:
            JSON response with complete financial data
        """
        url = "https://api.polygon.io/vX/reference/financials"
        params = {
            "ticker": ticker,
            "limit": limit,
            "timeframe": timeframe,
            "sort": "filing_date",
            "order": "desc",
            "apiKey": self.api_key
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_news(self, ticker, limit=5):
        """
        Fetch latest news articles for a stock from Polygon.io.
        
        Args:
            ticker: Stock ticker symbol
            limit: Number of articles to retrieve (default: 5)
        
        Returns:
            JSON response with news articles
        """
        url = "https://api.polygon.io/v2/reference/news"
        params = {
            "ticker": ticker,
            "limit": limit,
            "apiKey": self.api_key
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

    
    

class StockDataService:
    """Service class for managing stock data operations"""
    
    def __init__(self):
        self.polygon_service = PolygonAPIService()
    
    def get_cached_data(self, ticker):
        """Check if we have recent cached data (within 1 hour)"""
        recent_data = StockData.objects.filter(
            ticker=ticker,
            last_updated__gte=timezone.now() - timedelta(hours=1)
        ).first()
        
        if recent_data:
            return recent_data, "database"
        return None, None
    
    def fetch_and_cache_data(self, ticker):
        """Fetch data from Polygon.io and cache it"""
        try:
            # Get ticker information
            ticker_data = self.polygon_service.get_ticker_info(ticker)
            if ticker_data.get("status") != "OK":
                raise ValueError("Failed to fetch ticker information")
            
            ticker_info = ticker_data.get("results", {})
            
            # Get daily OHLC data (tries today first, falls back to previous day)
            ohlc_data_response = self.polygon_service.get_daily_ohlc(ticker)
            ohlc_info = ohlc_data_response.get("results", [{}])[0] if ohlc_data_response.get("results") else {}
            
            # Also get previous close for current_price (for consistency)
            prev_close_data = self.polygon_service.get_previous_close(ticker)
            prev_close_info = prev_close_data.get("results", [{}])[0] if prev_close_data.get("results") else {}
            
            # Create or update stock data
            # First try to get existing record
            try:
                stock_data = StockData.objects.get(ticker=ticker)
                # Update existing record
                stock_data.name = ticker_info.get('name', ticker)
                stock_data.current_price = prev_close_info.get('c')
                stock_data.market_cap = ticker_info.get('market_cap')
                stock_data.volume = prev_close_info.get('v')
                stock_data.last_updated = timezone.now()
                stock_data.save()
            except StockData.DoesNotExist:
                # Create new record with explicit ID
                # Get the next available ID
                max_id = StockData.objects.aggregate(max_id=models.Max('id'))['max_id'] or 0
                stock_data = StockData.objects.create(
                    id=max_id + 1,
                    ticker=ticker,
                    name=ticker_info.get('name', ticker),
                    current_price=prev_close_info.get('c'),
                    market_cap=ticker_info.get('market_cap'),
                    volume=prev_close_info.get('v'),
                    last_updated=timezone.now()
                )
            
            return stock_data, "polygon_api", ohlc_info
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch data from Polygon.io: {str(e)}")
        except Exception as e:
            raise Exception(f"An error occurred: {str(e)}")
    
    def get_stock_data(self, ticker):
        """Main method to get stock data (cached or fresh)"""
        # First check cache
        cached_data, source = self.get_cached_data(ticker)
        if cached_data:
            # If cached, we still need to fetch OHLC data for the response
            # Fetch fresh OHLC data (tries today first, falls back to previous day)
            ohlc_data_response = self.polygon_service.get_daily_ohlc(ticker)
            ohlc_info = ohlc_data_response.get("results", [{}])[0] if ohlc_data_response.get("results") else {}
            return cached_data, source, ohlc_info
        
        # If no cache, fetch from API
        return self.fetch_and_cache_data(ticker)
    
    def search_companies(self, query):
        """Search for companies by name and return matching tickers"""
        try:
            search_results = self.polygon_service.search_tickers(query)
            if search_results.get("status") != "OK":
                raise ValueError("Failed to search companies")
            
            results = search_results.get("results", [])
            return results
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to search companies: {str(e)}")
        except Exception as e:
            raise Exception(f"An error occurred during search: {str(e)}")
