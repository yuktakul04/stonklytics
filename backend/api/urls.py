from django.urls import path
from .views_legacy import (
    login_view, signup_view, get_profile, watchlist_view, remove_from_watchlist, create_watchlist, add_to_watchlist, delete_watchlist, chat_view,
)
from . import views_watchlist as wl
from . import views_summary as vs

urlpatterns = [
    # Legacy endpoints
    path('login', login_view, name='login'),
    path('signup', signup_view, name='signup'),
    path('profile', get_profile, name='get-profile'),
    path('watchlist', watchlist_view, name='watchlist'),
    path('watchlist/create', create_watchlist, name='create-watchlist'),
    path('watchlist/add', add_to_watchlist, name='add-to-watchlist'),
    path('watchlist/remove/<str:ticker>', remove_from_watchlist, name='remove-from-watchlist'),
    path('watchlist/delete/<str:watchlist_id>', delete_watchlist, name='delete-watchlist'),
    path('chat', chat_view, name='chat'),

    # New endpoints
    path("watchlists", wl.list_watchlists),
    path("watchlists/create", wl.create_watchlist),
    path("watchlists/<uuid:watchlist_id>/items", wl.add_symbol),
    path("watchlists/<uuid:watchlist_id>/items/<str:symbol>", wl.remove_symbol),

    # stock summary with optional ?force=1
    path("summary/<str:symbol>", vs.get_stock_summary),
]
