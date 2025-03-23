from django.urls import path
from .views import *
from .views import UserListView

urlpatterns = [
    path('register', UserRegistrationView.as_view(), name='register'),
    path('login', UserLoginView.as_view(), name='login'),
    path('logout', UserLogoutView.as_view(), name='logout'),
    path('', UserListView.as_view(), name='user-list'),
    path('user', UserProfileView.as_view(), name='user-profile'),

] 