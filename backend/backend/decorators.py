"""
Custom decorators for Firebase authentication
"""
from functools import wraps
from rest_framework import status
from .firebase_auth import get_firebase_uid_from_request
from django.http import JsonResponse

def firebase_auth_required(view_func):
    """
    Decorator to require Firebase authentication
    Adds firebase_uid to the request object
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        firebase_uid, error = get_firebase_uid_from_request(request)
    
        if error:
            return JsonResponse(
                {"error": f"Authentication failed: {error}"}, 
                status=401
            )
        
        # Add firebase_uid to request for use in the view
        request.firebase_uid = firebase_uid
        return view_func(request, *args, **kwargs)
    
    return wrapper

