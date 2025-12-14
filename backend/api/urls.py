from django.urls import path

# Import legacy views **safely**, ONLY for functions that do NOT depend on old Watchlist model
# (login, signup, profile, chat still work; the old watchlist endpoints DO NOT — they break the server)
from . import views_legacy

# New modular views
from . import views_watchlist as wl
from . import views_summary as vs

urlpatterns = [
    # ------------------------
    # Legacy AUTH + CHAT
    # ------------------------
    path("login", views_legacy.login_view, name="login"),
    path("signup", views_legacy.signup_view, name="signup"),
    path("profile", views_legacy.get_profile, name="get-profile"),
    path("chat", views_legacy.chat_view, name="chat"),
    path("market-news", views_legacy.market_news_view, name="market-news"),

    # ------------------------
    # Legacy Watchlist Endpoints (for frontend compatibility)
    # ------------------------
    path("watchlist", views_legacy.watchlist_view, name="watchlist"),
    path("watchlist/create", views_legacy.create_watchlist, name="create-watchlist"),
    path("watchlist/add", views_legacy.add_to_watchlist, name="add-to-watchlist"),
    path("watchlist/remove/<str:ticker>", views_legacy.remove_from_watchlist, name="remove-from-watchlist"),
    path("watchlist/delete/<str:watchlist_id>", views_legacy.delete_watchlist, name="delete-watchlist"),

    # ------------------------
    # NEW Watchlist System (Firebase + new DB schema)
    # ------------------------
    path("watchlists", wl.list_watchlists, name="watchlists-list"),
    path("watchlists/create", wl.create_watchlist, name="watchlists-create"),
    path("watchlists/<uuid:watchlist_id>/items", wl.add_symbol, name="watchlists-add"),
    path(
        "watchlists/<uuid:watchlist_id>/items/<str:symbol>",
        wl.remove_symbol,
        name="watchlists-remove",
    ),

    # ------------------------
    # AI Summary Endpoint
    # ------------------------
    path("summary/<str:symbol>", vs.get_stock_summary, name="stock-summary"),
]
