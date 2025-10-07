from django.urls import path
from . import views_watchlist as wl

urlpatterns = [
    path("watchlists", wl.list_watchlists),
    path("watchlists/create", wl.create_watchlist),
    path("watchlists/<uuid:watchlist_id>/items", wl.add_symbol),
    path("watchlists/<uuid:watchlist_id>/items/<str:symbol>", wl.remove_symbol),
]
