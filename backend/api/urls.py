from django.urls import path
from .views import (
    login_view, signup_view, get_profile, watchlist_view, remove_from_watchlist, create_watchlist, add_to_watchlist, delete_watchlist,
)

urlpatterns = [
    path('login', login_view, name='login'),
    path('signup', signup_view, name='signup'),
    path('profile', get_profile, name='get-profile'),
    path('watchlist', watchlist_view, name='watchlist'),
    path('watchlist/create', create_watchlist, name='create-watchlist'),
    path('watchlist/add', add_to_watchlist, name='add-to-watchlist'),
    path('watchlist/remove/<str:ticker>', remove_from_watchlist, name='remove-from-watchlist'),
    path('watchlist/delete/<str:watchlist_id>', delete_watchlist, name='delete-watchlist'),
]