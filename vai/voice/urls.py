from django.urls import path
from .views import save_audio

urlpatterns = [
    path('save-audio', save_audio, name='save_audio'),
    
]
