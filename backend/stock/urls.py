from django.urls import path
from .views import get_stock_data

app_name = 'stock'

urlpatterns = [
    path('data/', get_stock_data, name='stock-data'),
]
