import requests
import os
from django.utils import timezone
from datetime import timedelta
from .models import StockData

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
            
            # Get previous close data
            prev_close_data = self.polygon_service.get_previous_close(ticker)
            prev_close_info = prev_close_data.get("results", [{}])[0] if prev_close_data.get("results") else {}
            
            # Create or update stock data
            stock_data, created = StockData.objects.update_or_create(
                ticker=ticker,
                defaults={
                    'name': ticker_info.get('name', ticker),
                    'current_price': prev_close_info.get('c'),  # Close price
                    'market_cap': ticker_info.get('market_cap'),
                    'volume': prev_close_info.get('v'),  # Volume
                    'high_52_week': ticker_info.get('high_52_week'),
                    'low_52_week': ticker_info.get('low_52_week'),
                    'last_updated': timezone.now()
                }
            )
            
            return stock_data, "polygon_api"
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch data from Polygon.io: {str(e)}")
        except Exception as e:
            raise Exception(f"An error occurred: {str(e)}")
    
    def get_stock_data(self, ticker):
        """Main method to get stock data (cached or fresh)"""
        # First check cache
        cached_data, source = self.get_cached_data(ticker)
        if cached_data:
            return cached_data, source
        
        # If no cache, fetch from API
        return self.fetch_and_cache_data(ticker)
