from django.urls import path
from .views import get_stock_data
from .views import get_historical_data

app_name = 'stock'

urlpatterns = [
    path('data/', get_stock_data, name='stock-data'),
    path('data/historical/', get_historical_data, name='stock-historical'),

]
