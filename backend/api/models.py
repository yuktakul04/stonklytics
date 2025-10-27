from django.db import models
from django.contrib.auth.models import User
import uuid

# Create your models here.

class Profile(models.Model):
    """
    Model for the profiles table in Supabase
    """
    firebase_uid = models.TextField(primary_key=True)
    email = models.TextField(null=True, blank=True)
    display_name = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    
    class Meta:
        managed = False  
        db_table = 'profiles'
        verbose_name = 'Profile'
        verbose_name_plural = 'Profiles'
    
    def __str__(self):
        return f"{self.display_name or self.email or self.firebase_uid}"

class Watchlist(models.Model):
    """
    Model for the watchlists table in Supabase
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firebase_uid = models.TextField()
    name = models.TextField()
    created_at = models.DateTimeField()
    
    class Meta:
        managed = False  
        db_table = 'watchlists'
        verbose_name = 'Watchlist'
        verbose_name_plural = 'Watchlists'
    
    def __str__(self):
        return f"{self.name} ({self.firebase_uid})"

class WatchlistItem(models.Model):
    """
    Model for the watchlist_items table in Supabase
    """
    watchlist = models.ForeignKey(
        Watchlist, 
        on_delete=models.CASCADE,
        db_column='watchlist_id',
        related_name='items'
    )
    symbol = models.TextField()
    added_at = models.DateTimeField()
    
    class Meta:
        managed = False
        db_table = 'watchlist_items'
        verbose_name = 'Watchlist Item'
        verbose_name_plural = 'Watchlist Items'
        # Use a composite primary key since the table doesn't have an id column
        unique_together = [['watchlist', 'symbol']]
    
    def __str__(self):
        return f"{self.symbol} in {self.watchlist.name}"
