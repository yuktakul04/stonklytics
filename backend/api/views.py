from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.db import connection
from django.utils import timezone
from .models import Watchlist, WatchlistItem, Profile
from backend.decorators import firebase_auth_required
import json
import google.generativeai as genai
import os

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
@api_view(['GET'])
def watchlist_view(request):
    """
    GET: Retrieve user's watchlist
    """
    firebase_uid = request.firebase_uid
    
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

@firebase_auth_required
@api_view(['POST'])
def create_watchlist(request):
    """
    Create a new watchlist
    """
    firebase_uid = request.firebase_uid
    watchlist_name = request.data.get('name', 'My Watchlist')
    
    if not firebase_uid:
        return Response({"detail": "Firebase UID is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    if not watchlist_name:
        return Response({"detail": "Watchlist name is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Create new watchlist using raw SQL since it's an unmanaged model
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO watchlists (firebase_uid, name, created_at)
                VALUES (%s, %s, NOW())
                RETURNING id, firebase_uid, name, created_at
            """, [firebase_uid, watchlist_name])
            
            result = cursor.fetchone()
            watchlist_id, firebase_uid_val, name, created_at = result
        
        return Response({
            'message': 'Watchlist created successfully',
            'watchlist': {
                'id': str(watchlist_id),
                'firebase_uid': firebase_uid_val,
                'name': name,
                'created_at': created_at,
                'items': []
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@firebase_auth_required
@api_view(['POST'])
def add_to_watchlist(request):
    """
    Add stock to watchlist
    """
    firebase_uid = request.firebase_uid
    ticker = request.data.get('ticker', '').upper()
    watchlist_id = request.data.get('watchlist_id')
    watchlist_name = request.data.get('name', 'My Watchlist')
    
    if not ticker:
        return Response({"detail": "Ticker is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    if not firebase_uid:
        return Response({"detail": "Firebase UID is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # If watchlist_id is provided, use that watchlist; otherwise get or create a default one
        if watchlist_id:
            watchlist = Watchlist.objects.filter(id=watchlist_id, firebase_uid=firebase_uid).first()
            if not watchlist:
                return Response({"detail": "Watchlist not found or access denied"}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Get or create watchlist
            watchlist, created = Watchlist.objects.get_or_create(
                firebase_uid=firebase_uid,
                defaults={'name': watchlist_name}
            )
        
        # Check if item already exists in watchlist using raw SQL
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT symbol FROM watchlist_items WHERE watchlist_id = %s AND symbol = %s",
                [watchlist.id, ticker]
            )
            if cursor.fetchone():
                return Response({"detail": "Stock already in watchlist"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Add item to watchlist using raw SQL since it's an unmanaged model
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

@firebase_auth_required
@api_view(['DELETE'])
def delete_watchlist(request, watchlist_id):
    """
    Delete a watchlist and all its items
    """
    firebase_uid = request.firebase_uid
    
    try:
        # Verify the watchlist belongs to the user
        watchlist = Watchlist.objects.filter(id=watchlist_id, firebase_uid=firebase_uid).first()
        if not watchlist:
            return Response({"detail": "Watchlist not found or access denied"}, status=status.HTTP_404_NOT_FOUND)
        
        # Delete watchlist items first (cascade delete)
        with connection.cursor() as cursor:
            # Delete all items in the watchlist
            cursor.execute(
                "DELETE FROM watchlist_items WHERE watchlist_id = %s",
                [watchlist_id]
            )
            
            # Delete the watchlist itself
            cursor.execute(
                "DELETE FROM watchlists WHERE id = %s",
                [watchlist_id]
            )
        
        return Response({"message": "Watchlist deleted successfully"})
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@firebase_auth_required
@api_view(['POST'])
def chat_view(request):
    """
    AI Chat endpoint using Google Gemini for finance-related questions
    """
    try:
        # Get API key from environment
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return Response(
                {"error": "Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        # Get message and history from request
        user_message = request.data.get('message', '')
        history = request.data.get('history', [])
        
        if not user_message:
            return Response(
                {"error": "Message is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Create chat with history
        chat = model.start_chat(history=history)
        
        # System context to guide the AI
        system_context = """You are a knowledgeable financial assistant for Stonklytics, a stock market analytics platform. 
Your role is to help users understand stocks, markets, investing strategies, and financial concepts.

Guidelines:
- Provide accurate, educational information about finance, stocks, and investing
- Explain complex financial concepts in simple terms
- Offer insights on market trends, technical analysis, and fundamental analysis
- Be helpful and conversational
- KEEP RESPONSES CONCISE AND SHORT - aim for 2-3 sentences unless more detail is specifically requested
- Use bullet points for clarity when listing multiple items
- Always remind users that you provide educational information, not financial advice
- If asked about specific stock recommendations, emphasize that users should do their own research and consult with financial advisors
- Stay focused on finance-related topics

If a question is completely unrelated to finance, politely redirect the conversation back to financial topics."""
        
        # Send message with system context
        full_message = f"{system_context}\n\nUser question: {user_message}"
        response = chat.send_message(full_message)
        
        return Response({
            "message": response.text,
            "role": "model"
        })
        
    except Exception as e:
        print(f"Chat error: {str(e)}")
        return Response(
            {"error": f"Failed to get response from AI: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
