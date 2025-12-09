from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .services import StockDataService
from .serializers import StockDataResponseSerializer
from datetime import datetime
import requests


@api_view(["GET"])
def get_stock_data(request):
    """
    Fetch stock data from Polygon.io API
    Query parameter: ticker (e.g., ?ticker=AAPL)
    """
    ticker = request.GET.get('ticker', '').upper()
    
    if not ticker:
        return Response(
            {"error": "Ticker symbol is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        stock_service = StockDataService()
        stock_data, source, ohlc_data = stock_service.get_stock_data(ticker)
        
        # Extract OHLC values from Polygon API response
        # Polygon API returns: o (open), h (high), l (low), c (close)
        open_price = ohlc_data.get('o') if ohlc_data else None
        high_price = ohlc_data.get('h') if ohlc_data else None
        low_price = ohlc_data.get('l') if ohlc_data else None
        close_price = ohlc_data.get('c') if ohlc_data else None
        
        # Serialize the response
        response_data = {
            "ticker": stock_data.ticker,
            "name": stock_data.name,
            "current_price": float(stock_data.current_price) if stock_data.current_price else None,
            "market_cap": stock_data.market_cap,
            "volume": stock_data.volume,
            "last_updated": stock_data.last_updated,
            "source": source,
            "open_price": float(open_price) if open_price is not None else None,
            "high_price": float(high_price) if high_price is not None else None,
            "low_price": float(low_price) if low_price is not None else None,
            "close_price": float(close_price) if close_price is not None else None
        }
        
        return Response(response_data)
        
    except ValueError as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {"error": f"An error occurred: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
def search_companies(request):
    """
    Search for companies by name
    Query parameter: q (e.g., ?q=apple)
    """
    query = request.GET.get('q', '').strip()
    
    if not query:
        return Response(
            {"error": "Search query is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(query) < 2:
        return Response(
            {"error": "Search query must be at least 2 characters"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        stock_service = StockDataService()
        results = stock_service.search_companies(query)
        
        # Format the results for the frontend
        formatted_results = []
        for result in results:
            formatted_results.append({
                "ticker": result.get("ticker"),
                "name": result.get("name"),
                "market": result.get("market"),
                "locale": result.get("locale"),
                "primary_exchange": result.get("primary_exchange"),
                "type": result.get("type"),
                "active": result.get("active")
            })
        
        return Response({
            "query": query,
            "results": formatted_results,
            "count": len(formatted_results)
        })
        
    except ValueError as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {"error": f"An error occurred: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["GET"])
def get_historical_data(request):
    """
    Fetch historical stock data using Polygon.io
    Query params:
        - ticker (e.g., AAPL)
        - from (e.g., 2023-01-01)
        - to (e.g., 2023-01-10)
    """
    ticker = request.GET.get('ticker', '').upper()
    from_date = request.GET.get('from')
    to_date = request.GET.get('to')

    if not ticker or not from_date or not to_date:
        return Response(
            {"error": "ticker, from, and to parameters are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        polygon_service = StockDataService().polygon_service
        raw_data = polygon_service.get_historical_prices(ticker, from_date, to_date)

        results = raw_data.get("results", [])
        if not results:
            return Response({"message": "No data found", "ticker": ticker, "prices": []})

        prices = [
            {
                "date": datetime.utcfromtimestamp(day["t"] / 1000).strftime('%Y-%m-%d'),
                "open": day.get("o"),
                "high": day.get("h"),
                "low": day.get("l"),
                "close": day.get("c"),
                "volume": day.get("v", 0)
            }
            for day in results
        ]

        return Response({
            "ticker": ticker,
            "from": from_date,
            "to": to_date,
            "prices": prices,
            "source": "polygon_api"
        })

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_financials(request):
    """
    Fetch comprehensive financial data from Polygon.io (includes balance sheet, cash flow, income statement)
    Query params:
        - ticker (e.g., AAPL)
        - limit (optional, default: 4)
        - timeframe (optional, default: 'quarterly')
    """
    ticker = request.GET.get('ticker', '').upper()
    limit = request.GET.get('limit', '4')
    timeframe = request.GET.get('timeframe', 'quarterly')
    
    if not ticker:
        return Response(
            {"error": "Ticker symbol is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Validate limit
        try:
            limit = int(limit)
            if limit < 1 or limit > 50:
                limit = 4
        except ValueError:
            limit = 4
        
        # Validate timeframe
        valid_timeframes = ['quarterly', 'annual']
        if timeframe not in valid_timeframes:
            timeframe = 'quarterly'
        
        polygon_service = StockDataService().polygon_service
        financial_data = polygon_service.get_financials(ticker, limit, timeframe)
        
        if financial_data.get("status") != "OK":
            return Response(
                {"error": "Failed to fetch financial data from Polygon.io"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            "ticker": ticker,
            "results": financial_data.get("results", []),
            "count": financial_data.get("count", 0),
            "source": "polygon_api"
        })
        
    except requests.exceptions.HTTPError as e:
        return Response(
            {"error": f"API request failed: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {"error": f"An error occurred: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
def get_news(request):
    """
    Fetch latest news articles for a stock from Polygon.io
    Query params:
        - ticker (e.g., AAPL)
        - limit (optional, default: 5)
    """
    ticker = request.GET.get('ticker', '').upper()
    limit = request.GET.get('limit', '5')
    
    if not ticker:
        return Response(
            {"error": "Ticker symbol is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Validate limit
        try:
            limit = int(limit)
            if limit < 1 or limit > 50:
                limit = 5
        except ValueError:
            limit = 5
        
        polygon_service = StockDataService().polygon_service
        news_data = polygon_service.get_news(ticker, limit)
        
        if news_data.get("status") != "OK":
            return Response(
                {"error": "Failed to fetch news data from Polygon.io"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            "ticker": ticker,
            "results": news_data.get("results", []),
            "count": news_data.get("count", 0),
            "source": "polygon_api"
        })
        
    except requests.exceptions.HTTPError as e:
        return Response(
            {"error": f"API request failed: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {"error": f"An error occurred: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
