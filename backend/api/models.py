from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class Profile(models.Model):
    firebase_uid = models.CharField(max_length=128, primary_key=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    display_name = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = "profiles"
        managed = False  # Table already created in Supabase

    def __str__(self):
        return self.email or self.firebase_uid


class Watchlist(models.Model):
    firebase_uid = models.CharField(max_length=128, db_index=True)
    ticker = models.CharField(max_length=10)
    name = models.CharField(max_length=200, blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "watchlists"
        managed = False  # Table already created in Supabase
        unique_together = ['firebase_uid', 'ticker']
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.firebase_uid} - {self.ticker}"

class WatchlistItem(models.Model):
    watchlist = models.ForeignKey(
        Watchlist,
        db_column="watchlist_id",
        on_delete=models.CASCADE,
        related_name="items",
    )
    symbol = models.CharField(max_length=16)
    added_at = models.DateTimeField()

    class Meta:
        db_table = "watchlist_items"
        managed = False  # Table already created in Supabase
        unique_together = (("watchlist", "symbol"),)

    def __str__(self):
        return f"{self.symbol} ({self.watchlist_id})"