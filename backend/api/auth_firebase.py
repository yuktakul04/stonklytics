# api/auth_firebase.py
import os
from functools import wraps
from django.http import JsonResponse
import firebase_admin
from firebase_admin import credentials, auth as fba

if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("FIREBASE_SA_JSON_PATH"))
    firebase_admin.initialize_app(cred, {
        "projectId": os.getenv("FIREBASE_PROJECT_ID")
    })

def firebase_protected(view):
    @wraps(view)
    def _wrap(request, *args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return JsonResponse({"detail": "Missing token"}, status=401)
        token = auth.split(" ", 1)[1]
        try:
            decoded = fba.verify_id_token(token)
        except Exception:
            return JsonResponse({"detail": "Invalid token"}, status=401)
        request.firebase_uid = decoded["uid"]
        request.user_email = decoded.get("email")
        return view(request, *args, **kwargs)
    return _wrap
