# api/models.py
from django.db import models

class SummaryCache(models.Model):
    symbol = models.CharField(max_length=16, unique=True, db_index=True)
    summary = models.TextField()
    sources = models.JSONField(null=True, blank=True, default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "summary_cache"

    def __str__(self):
        return f"{self.symbol} @ {self.created_at}"
