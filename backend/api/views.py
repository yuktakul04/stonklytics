from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


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
