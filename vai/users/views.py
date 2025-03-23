from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from .serializers import UserRegistrationSerializer, UserLoginSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.views.decorators.csrf import csrf_exempt

from rest_framework import generics
from .models import User


class UserListView(generics.ListAPIView):
    """
    View to list all users.
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [IsAuthenticated] 



class UserRegistrationView(APIView):
    permission_classes = [AllowAny]
    
    @csrf_exempt
    def post(self, request):
            if not self.request.session.exists(self.request.session.session_key):
                self.request.session.create()
 
            serializer = UserRegistrationSerializer(data=request.data)
            if serializer.is_valid():
                user = serializer.save()
                request.session['name'] = user.name
                request.session['email'] = user.email
                login(request, user)
                # Log the user in immediately after registration
                return Response({
                    'status': 'success',
                    'user': {
                        'email': user.email,
                        'name': user.name,
                    }
                }, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        if not self.request.session.exists(self.request.session.session_key):
                self.request.session.create()
        serializer = UserLoginSerializer(data=request.data)

        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            request.session['name'] = User.objects.get(email=email).name
            request.session['email'] = email
            user = authenticate(request, username=email, password=password)
            
            if user is not None:
                login(request, user)  # Create session for user
                return Response({
                    'status': 'success',
                    'user': {
                        'email': user.email,
                        'name': user.name,
                    }
                })
            return Response({
                'status': 'error',
                'message': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserLogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if not self.request.session.exists(self.request.session.session_key):
                self.request.session.create()
        logout(request)  # Clear the session
        return Response({
            'status': 'success',
            'message': 'Successfully logged out'
        }) 

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'email': user.email,
            'name': user.name,
        })
