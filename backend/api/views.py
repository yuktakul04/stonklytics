from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.db import connection
from django.utils import timezone
from .models import Watchlist, WatchlistItem, Profile
from backend.decorators import firebase_auth_required
import json

@firebase_auth_required
@api_view(["POST"]) 
def signup_view(request):
    """
    Create a profile for a newly signed up user
    This endpoint should be called after Firebase authentication is completed on the frontend
    """
    firebase_uid = request.firebase_uid
    email = request.data.get("email")
    display_name = request.data.get("display_name", "")
    if not firebase_uid:
        return Response({"detail": "Firebase UID is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check if profile already exists
        existing_profile = Profile.objects.filter(firebase_uid=firebase_uid).first()
        if existing_profile:
            return Response({
                "message": "Profile already exists", 
                "profile": {
                    "firebase_uid": existing_profile.firebase_uid,
                    "email": existing_profile.email,
                    "display_name": existing_profile.display_name,
                    "created_at": existing_profile.created_at
                }
            })
        
        # Create new profile using raw SQL since it's an unmanaged model
        current_time = timezone.now()
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO profiles (firebase_uid, email, display_name, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
            """, [firebase_uid, email, display_name, current_time, current_time])
        
        # Fetch the created profile to return
        created_profile = Profile.objects.get(firebase_uid=firebase_uid)
        return Response({
            "message": "Profile created successfully",
            "profile": {
                "firebase_uid": created_profile.firebase_uid,
                "email": created_profile.email,
                "display_name": created_profile.display_name,
                "created_at": created_profile.created_at
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"]) 
def login_view(request):
    email = request.data.get("email")
    password = request.data.get("password")
    if not email or not password:
        return Response({"detail": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"message": "Logged in", "email": email})

@firebase_auth_required
@api_view(["GET"])
def get_profile(request):
    """
    Get user profile information
    """
    firebase_uid = request.firebase_uid
    
    try:
        profile = Profile.objects.filter(firebase_uid=firebase_uid).first()
        if not profile:
            return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            "firebase_uid": profile.firebase_uid,
            "email": profile.email,
            "display_name": profile.display_name,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@firebase_auth_required
@api_view(['GET', 'POST'])
def watchlist_view(request):
    """
    GET: Retrieve user's watchlist
    POST: Add stock to watchlist
    """
    firebase_uid = request.firebase_uid
    
    if request.method == 'GET':
        try:
            if firebase_uid:
                # Get watchlists for specific user
                watchlists = Watchlist.objects.filter(firebase_uid=firebase_uid)
                data = []
                for watchlist in watchlists:
                    watchlist_data = {
                        'id': str(watchlist.id),
                        'name': watchlist.name,
                        'firebase_uid': watchlist.firebase_uid,
                        'created_at': watchlist.created_at,
                        'items': []
                    }
                    # Get items for this watchlist using raw SQL since it's an unmanaged model
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "SELECT symbol, added_at FROM watchlist_items WHERE watchlist_id = %s",
                            [watchlist.id]
                        )
                        items = cursor.fetchall()
                        
                        for symbol, added_at in items:
                            watchlist_data['items'].append({
                                'symbol': symbol,
                                'added_at': added_at
                            })
                    data.append(watchlist_data)
                return Response(data)
           
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        ticker = request.data.get('ticker', '').upper()
        watchlist_name = request.data.get('name', 'My Watchlist')
        firebase_uid = request.data.get('firebase_uid', firebase_uid)
        
        if not ticker:
            return Response({"detail": "Ticker is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not firebase_uid:
            return Response({"detail": "Firebase UID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get or create watchlist
            watchlist, created = Watchlist.objects.get_or_create(
                firebase_uid=firebase_uid,
                defaults={'name': watchlist_name}
            )
            
            # Check if item already exists in watchlist
            if WatchlistItem.objects.filter(watchlist=watchlist, symbol=ticker).exists():
                return Response({"detail": "Stock already in watchlist"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Add item to watchlist using raw SQL since it's an unmanaged model
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO watchlist_items (watchlist_id, symbol, added_at) VALUES (%s, %s, NOW())",
                    [watchlist.id, ticker]
                )
            
            return Response({
                'message': f'Added {ticker} to watchlist',
                'watchlist_id': str(watchlist.id),
                'ticker': ticker,
                'watchlist_name': watchlist.name
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@firebase_auth_required
@api_view(['DELETE'])
def remove_from_watchlist(request, ticker):
    """
    Remove stock from watchlist
    """
    firebase_uid = request.firebase_uid    
    try:
        # Find the user's watchlist
        watchlist = Watchlist.objects.filter(firebase_uid=firebase_uid).first()
        if not watchlist:
            return Response({"detail": "No watchlist found for user"}, status=status.HTTP_404_NOT_FOUND)
        
        # Remove item from watchlist using raw SQL
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM watchlist_items WHERE watchlist_id = %s AND symbol = %s",
                [watchlist.id, ticker.upper()]
            )
            
            if cursor.rowcount == 0:
                return Response({"detail": "Stock not in watchlist"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({"message": f"Removed {ticker} from watchlist"})
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
