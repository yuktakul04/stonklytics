from django.db import models
from django.utils import timezone

# Create your models here.

class StockData(models.Model):
    """
    Model for the stock_stockdata table in Supabase
    """
    id = models.BigIntegerField(primary_key=True)
    ticker = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    current_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    market_cap = models.BigIntegerField(null=True, blank=True)
    volume = models.BigIntegerField(null=True, blank=True)
    last_updated = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        managed = False  
        db_table = 'stock_stockdata'
        ordering = ['-last_updated']
        verbose_name = 'Stock Data'
        verbose_name_plural = 'Stock Data'
    
    def __str__(self):
        return f"{self.ticker} - {self.name}"
