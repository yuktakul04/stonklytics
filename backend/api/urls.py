from django.urls import path
from .views import (
    login_view, signup_view, get_profile, watchlist_view, remove_from_watchlist,
)

urlpatterns = [
    path('login', login_view, name='login'),
    path('signup', signup_view, name='signup'),
    path('profile', get_profile, name='get-profile'),
    path('watchlist', watchlist_view, name='watchlist'),
    path('watchlist/<str:ticker>', remove_from_watchlist, name='remove-from-watchlist'),
]