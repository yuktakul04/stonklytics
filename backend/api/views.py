from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from .models import Watchlist
import json

@api_view(["POST"]) 
def signup_view(request):
    email = request.data.get("email")
    password = request.data.get("password")
    if not email or not password:
        return Response({"detail": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)
    # TODO: Implement Auth
    return Response({"message": "Account created", "email": email})


@api_view(["POST"]) 
def login_view(request):
    email = request.data.get("email")
    password = request.data.get("password")
    if not email or not password:
        return Response({"detail": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)
   # TODO: Implement Auth
    return Response({"message": "Logged in", "email": email})

@api_view(['GET', 'POST'])
def watchlist_view(request):
    """
    GET: Retrieve user's watchlist
    POST: Add stock to watchlist
    """
    # For now, we'll use a simple approach without authentication
    # In production, you'd want to implement proper Firebase token verification
    
    if request.method == 'GET':
        # For demo purposes, get all watchlist items
        # In production, filter by authenticated user
        watchlist = Watchlist.objects.all()
        data = [{
            'id': item.id,
            'ticker': item.ticker,
            'name': item.name,
            'added_at': item.added_at
        } for item in watchlist]
        return Response(data)
    
    elif request.method == 'POST':
        ticker = request.data.get('ticker', '').upper()
        name = request.data.get('name', '')
        
        if not ticker:
            return Response({"detail": "Ticker is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # For demo purposes, create a default user or get the first user
        # In production, you'd get the user from the Firebase token
        try:
            user = User.objects.first()
            if not user:
                # Create a default user for demo
                user = User.objects.create_user(
                    username='demo_user',
                    email='demo@example.com',
                    password='demo_password'
                )
        except:
            user = User.objects.first()
        
        # Check if already in watchlist
        if Watchlist.objects.filter(user=user, ticker=ticker).exists():
            return Response({"detail": "Stock already in watchlist"}, status=status.HTTP_400_BAD_REQUEST)
        
        watchlist_item = Watchlist.objects.create(
            user=user,
            ticker=ticker,
            name=name
        )
        
        return Response({
            'id': watchlist_item.id,
            'ticker': watchlist_item.ticker,
            'name': watchlist_item.name,
            'added_at': watchlist_item.added_at
        }, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
def remove_from_watchlist(request, ticker):
    """
    Remove stock from watchlist
    """
    try:
        # For demo purposes, get the first user
        # In production, you'd get the user from the Firebase token
        user = User.objects.first()
        if not user:
            return Response({"detail": "No user found"}, status=status.HTTP_404_NOT_FOUND)
            
        watchlist_item = Watchlist.objects.get(user=user, ticker=ticker.upper())
        watchlist_item.delete()
        return Response({"message": "Removed from watchlist"})
    except Watchlist.DoesNotExist:
        return Response({"detail": "Stock not in watchlist"}, status=status.HTTP_404_NOT_FOUND)