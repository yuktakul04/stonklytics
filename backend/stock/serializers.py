from rest_framework import serializers
from .models import StockData

class StockDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockData
        fields = [
            'ticker', 'name', 'current_price', 'market_cap', 
            'volume', 'high_52_week', 'low_52_week', 
            'last_updated', 'created_at'
        ]
        read_only_fields = ['created_at', 'last_updated']

class StockDataResponseSerializer(serializers.Serializer):
    ticker = serializers.CharField()
    name = serializers.CharField()
    current_price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    market_cap = serializers.IntegerField(allow_null=True)
    volume = serializers.IntegerField(allow_null=True)
    high_52_week = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    low_52_week = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    last_updated = serializers.DateTimeField()
    source = serializers.CharField()
