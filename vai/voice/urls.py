from django.urls import path
from .views import home, record_audio

urlpatterns = [
    
    path('record', record_audio, name="record_audio"),
]
