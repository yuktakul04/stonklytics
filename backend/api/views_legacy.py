from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.db import connection
from django.utils import timezone
from .models import Watchlist, WatchlistItem, Profile
from backend.decorators import firebase_auth_required
import json
from google import genai
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
    Uses the new Google GenAI API with gemini-2.5-flash model
    """
    try:
        # Get API key from environment
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return Response(
                {"error": "Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Initialize the client (API key is read from GEMINI_API_KEY env variable)
        client = genai.Client()
        
        # Get message, history, and watchlist from request
        user_message = request.data.get('message', '')
        history = request.data.get('history', [])
        watchlist_data = request.data.get('watchlist', None)
        
        if not user_message:
            return Response(
                {"error": "Message is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Build watchlist context if provided
        watchlist_context = ""
        if watchlist_data and watchlist_data.get('stocks'):
            stocks = watchlist_data.get('stocks', [])
            stock_list = ", ".join([stock.get('ticker', '') for stock in stocks if stock.get('ticker')])
            if stock_list:
                watchlist_context = f"\n\nIMPORTANT - USER'S WATCHLIST CONTEXT:\nThe user has imported their watchlist named '{watchlist_data.get('name', 'My Watchlist')}' containing these stocks: {stock_list}.\n\nWhen the user asks questions, you should:\n- Reference these specific stocks when relevant to their question\n- Provide insights about these stocks if asked\n- Compare these stocks if the user asks for comparisons\n- Consider their portfolio context when giving advice\n- Ask follow-up questions about these stocks if relevant\n\nHowever, still maintain your conversational approach - don't overwhelm them with information about all stocks at once. Guide them step by step."
        
        # System instruction to guide the AI
        system_instruction = """You are a knowledgeable financial assistant for Stonklytics, a stock market analytics platform. 
Your role is to help users understand stocks, markets, investing strategies, and financial concepts through CONVERSATIONAL, STEP-BY-STEP guidance.

CRITICAL GUIDELINES:
1. CONVERSATIONAL APPROACH - Don't give long, comprehensive answers immediately. Instead:
   - Ask 1-2 clarifying follow-up questions to understand the user's specific needs, goals, or context
   - Break down complex topics into smaller, digestible conversations
   - Guide users through their questions step by step
   - Only provide direct, complete answers when the question is very specific and straightforward (e.g., "What is a P/E ratio?")

2. CONTEXT MANAGEMENT:
   - Remember previous questions and answers in the conversation
   - Build on previous context when answering follow-ups
   - Reference earlier parts of the conversation when relevant
   - If the user asks a new topic, acknowledge the shift but maintain conversational flow

3. RESPONSE STYLE:
   - Keep responses SHORT and CONVERSATIONAL (2-4 sentences max)
   - Ask ONE follow-up question at a time to keep the conversation focused
   - Use natural, friendly language - like talking to a friend
   - Use bullet points sparingly - prefer conversational flow
   - Format headers using ### for section titles (but don't overuse them)

4. EXAMPLES:
   - User: "Tell me about investing" → You: "Great question! To give you the most helpful guidance, are you just starting out, or do you have some experience? Also, what's your main goal - long-term wealth building, retirement planning, or something else?"
   - User: "What's a dividend?" → You: "A dividend is a portion of a company's profits paid to shareholders. Do you want to know how dividends work, or are you interested in finding dividend-paying stocks?"
   - User: "Explain technical analysis" → You: "Technical analysis uses charts and patterns to predict price movements. Are you looking to learn the basics, or do you want to understand specific indicators like moving averages or RSI?"

5. DIRECT ANSWERS ONLY WHEN:
   - Question is very specific and factual (e.g., "What does IPO stand for?")
   - User explicitly asks for a direct answer (e.g., "Just tell me directly")
   - User has already provided all necessary context through previous questions

6. DISCLAIMERS:
   - Always remind users that you provide educational information, not financial advice
   - Emphasize that users should do their own research and consult with financial advisors for personalized advice

7. TOPIC FOCUS:
   - Stay focused on finance-related topics
   - If asked about unrelated topics, politely redirect back to finance

Remember: Your goal is to have a CONVERSATION, not to deliver a lecture. Guide users through their learning journey with thoughtful questions."""
        
        # Build contents - can be a string or array of message objects
        if history and len(history) > 0:
            # Build contents array from history
            contents = []
            for msg in history:
                role = msg.get('role', 'user')
                parts = msg.get('parts', [])
                if parts and len(parts) > 0:
                    text = parts[0].get('text', '')
                    if text:
                        contents.append({
                            "role": role if role != 'model' else 'model',
                            "parts": [{"text": text}]
                        })
            
            # Add current user message with watchlist context if available
            user_message_with_context = user_message + watchlist_context
            contents.append({
                "role": "user",
                "parts": [{"text": user_message_with_context}]
            })
        else:
            # No history - combine system instruction with user message and watchlist context
            contents = system_instruction + watchlist_context + "\n\nUser question: " + user_message
        
        # Generate content using the new API with gemini-2.5-flash
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents
        )
        
        # Extract response text
        response_text = ""
        if hasattr(response, 'text'):
            response_text = response.text
        elif hasattr(response, 'candidates') and response.candidates:
            response_text = response.candidates[0].content.parts[0].text
        else:
            response_text = str(response)
        
        return Response({
            "message": response_text,
            "role": "model"
        })
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Chat error: {str(e)}")
        print(f"Traceback: {error_trace}")
        return Response(
            {"error": f"Failed to get response from AI: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@firebase_auth_required
@api_view(['GET'])
def market_news_view(request):
    """
    AI-generated market news using Gemini.
    Returns top market news and insights without calling external stock APIs.
    """
    try:
        # Get API key from environment
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return Response(
                {"error": "Gemini API key not configured."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Initialize the Gemini client
        client = genai.Client()
        
        # Get current date for context
        from datetime import datetime
        current_date = datetime.now().strftime("%B %d, %Y")
        
        # Prompt for generating market news
        current_time = datetime.now().strftime("%I:%M %p")
        prompt = f"""You are a financial news analyst. Generate a brief market news summary for today ({current_date}).

Provide exactly 5 news items in the following JSON format. Each item should be a real, plausible market news headline with a brief description based on current market trends and events.

Return ONLY valid JSON, no markdown, no code blocks, just the raw JSON array:

[
  {{
    "id": 1,
    "headline": "Brief news headline here",
    "summary": "2-3 sentence summary of the news and its market impact",
    "category": "one of: Markets, Tech, Economy, Earnings, Crypto, Energy, Healthcare",
    "sentiment": "one of: positive, negative, neutral",
    "time": "time in format like '2 hours ago', '45 minutes ago', '1 hour ago', 'Just now' - vary these realistically"
  }}
]

Focus on major market movements, tech stocks, economic indicators, notable earnings, and global market trends. Make them realistic and relevant to current market conditions. The current time is {current_time}."""

        # Generate content
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        # Extract response text
        response_text = ""
        if hasattr(response, 'text'):
            response_text = response.text
        elif hasattr(response, 'candidates') and response.candidates:
            response_text = response.candidates[0].content.parts[0].text
        else:
            response_text = str(response)
        
        # Clean up response - remove markdown code blocks if present
        response_text = response_text.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse JSON response
        try:
            news_items = json.loads(response_text)
        except json.JSONDecodeError:
            # If parsing fails, return a default response
            news_items = [{
                "id": 1,
                "headline": "Market Update",
                "summary": "Unable to generate news at this time. Please try again later.",
                "category": "Markets",
                "sentiment": "neutral"
            }]
        
        return Response({
            "news": news_items,
            "generated_at": current_date,
            "source": "ai_generated"
        })
        
    except Exception as e:
        import traceback
        print(f"Market news error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return Response(
            {"error": f"Failed to generate market news: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
