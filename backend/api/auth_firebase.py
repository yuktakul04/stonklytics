# api/auth_firebase.py
from __future__ import annotations

import json
import os
from functools import wraps
from typing import Optional

import firebase_admin
from firebase_admin import auth, credentials
from django.http import JsonResponse

# ---- Initialization ---------------------------------------------------------

def _init_firebase() -> firebase_admin.App:
    """
    Initialize Firebase Admin exactly once.

    Looks for credentials in this order:
      1) FIREBASE_CRED_PATH -> path to service account json
      2) FIREBASE_CREDENTIALS_JSON -> raw json string of the service account
      3) ./firebase-service-account.json (project root)
      4) GOOGLE_CLOUD_PROJECT / FIREBASE_PROJECT_ID -> initialize with explicit projectId
         (works only for environments that already have ADC; locally you usually
          want a service account file)
    """
    if firebase_admin._apps:
        # already initialized
        return firebase_admin.get_app()

    cred_path = os.getenv("FIREBASE_CRED_PATH")
    raw_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    default_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "firebase-service-account.json")
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("FIREBASE_PROJECT_ID")

    app: Optional[firebase_admin.App] = None

    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        app = firebase_admin.initialize_app(cred)
    elif raw_json:
        cred = credentials.Certificate(json.loads(raw_json))
        app = firebase_admin.initialize_app(cred)
    elif os.path.exists(default_file):
        cred = credentials.Certificate(default_file)
        app = firebase_admin.initialize_app(cred)
    elif project_id:
        # Explicitly pass projectId so Admin SDK knows which project to use
        app = firebase_admin.initialize_app(options={"projectId": project_id})
    else:
        # Be explicit so failures are obvious
        raise RuntimeError(
            "Firebase is not configured. Set FIREBASE_CRED_PATH (or FIREBASE_CREDENTIALS_JSON) "
            "or set GOOGLE_CLOUD_PROJECT / FIREBASE_PROJECT_ID."
        )

    return app


# ---- Decorator --------------------------------------------------------------

def firebase_protected(view_func):
    """
    Protect a Django view with Firebase ID token verification.
    Expects header: Authorization: Bearer <ID_TOKEN>
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        # Ensure Admin SDK is ready
        try:
            _init_firebase()
        except Exception as e:
            return JsonResponse({"detail": f"Auth init error: {str(e)}"}, status=500)

        auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JsonResponse({"detail": "Missing token"}, status=401)

        token = auth_header.split("Bearer ", 1)[1].strip()
        try:
            # If you ever run the emulator, set FIREBASE_AUTH_EMULATOR_HOST and disable cert checks:
            # https://firebase.google.com/docs/emulator-suite
            decoded = auth.verify_id_token(token)  # check_revoked=False (default)
            request.user = decoded  # contains uid, email, etc.
        except Exception as e:
            return JsonResponse({"detail": f"Invalid token: {str(e)}"}, status=401)

        return view_func(request, *args, **kwargs)
    return wrapper
