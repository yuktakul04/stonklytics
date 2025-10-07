from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class Watchlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watchlists')
    ticker = models.CharField(max_length=10)
    name = models.CharField(max_length=200, blank=True)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'ticker']
        ordering = ['-added_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.ticker}"
