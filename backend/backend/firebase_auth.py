"""
Firebase Authentication utilities for Django backend
"""
import firebase_admin
from firebase_admin import credentials, auth
from django.conf import settings
import os

class FirebaseAuth:
    """Firebase Authentication helper class"""
    
    def __init__(self):
        if not firebase_admin._apps:
            service_account_path = os.path.join(
                settings.BASE_DIR, 'firebase-service-account.json'
            )
            
            if os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
            else:
                print("Warning: Firebase service account key not found")
                print("Please download firebase-service-account.json from Firebase Console")
    
    def verify_token(self, token):
        """
        Verify Firebase ID token and return user info
        """
        try:
            # Verify the token
            decoded_token = auth.verify_id_token(token)
            firebase_uid = decoded_token['uid']
            
            # Get additional user info
            user_info = {
                'firebase_uid': firebase_uid,
                'email': decoded_token.get('email'),
                'email_verified': decoded_token.get('email_verified', False),
                'name': decoded_token.get('name'),
                'picture': decoded_token.get('picture')
            }
            
            return user_info
            
        except auth.InvalidIdTokenError:
            raise ValueError("Invalid Firebase token")
        except auth.ExpiredIdTokenError:
            raise ValueError("Firebase token has expired")
        except Exception as e:
            raise ValueError(f"Firebase authentication error: {str(e)}")

def get_firebase_uid_from_request(request):
    """
    Extract and verify Firebase UID from request headers
    """
    # Get token from Authorization header
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header.startswith('Bearer '):
        return None, "Invalid authorization header format"
    
    token = auth_header.split('Bearer ')[1]
    
    try:
        firebase_auth = FirebaseAuth()
        user_info = firebase_auth.verify_token(token)
        return user_info['firebase_uid'], None
    except ValueError as e:
        return None, str(e)

# Alternative approach using Firebase REST API (no SDK required)
def verify_firebase_token_rest(token):
    """
    Verify Firebase token using REST API (alternative to SDK)
    """
    import requests
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup"
    params = {
        'key': settings.SUPABASE_ANON_KEY  # You can use Firebase Web API key
    }
    data = {
        'idToken': token
    }
    
    try:
        response = requests.post(url, params=params, json=data)
        response.raise_for_status()
        
        result = response.json()
        if 'users' in result and len(result['users']) > 0:
            user = result['users'][0]
            return {
                'firebase_uid': user['localId'],
                'email': user.get('email'),
                'email_verified': user.get('emailVerified', False),
                'display_name': user.get('displayName')
            }
        else:
            raise ValueError("Invalid token")
            
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Token verification failed: {str(e)}")
    except Exception as e:
        raise ValueError(f"Authentication error: {str(e)}")
