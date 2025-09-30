from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .services import StockDataService
from .serializers import StockDataResponseSerializer

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
        stock_data, source = stock_service.get_stock_data(ticker)
        
        # Serialize the response
        response_data = {
            "ticker": stock_data.ticker,
            "name": stock_data.name,
            "current_price": float(stock_data.current_price) if stock_data.current_price else None,
            "market_cap": stock_data.market_cap,
            "volume": stock_data.volume,
            "high_52_week": float(stock_data.high_52_week) if stock_data.high_52_week else None,
            "low_52_week": float(stock_data.low_52_week) if stock_data.low_52_week else None,
            "last_updated": stock_data.last_updated,
            "source": source
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
