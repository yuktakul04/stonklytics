from django.urls import path
from .views import get_stock_data, get_historical_data, search_companies

app_name = 'stock'

urlpatterns = [
    path('data/', get_stock_data, name='stock-data'),
    path('data/historical/', get_historical_data, name='stock-historical'),
    path('search/', search_companies, name='search-companies'),
]
