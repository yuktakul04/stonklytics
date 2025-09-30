from django.db import models
from django.utils import timezone

# Create your models here.

class StockData(models.Model):
    ticker = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=200)
    current_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    market_cap = models.BigIntegerField(null=True, blank=True)
    volume = models.BigIntegerField(null=True, blank=True)
    high_52_week = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    low_52_week = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    last_updated = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-last_updated']
    
    def __str__(self):
        return f"{self.ticker} - {self.name}"
