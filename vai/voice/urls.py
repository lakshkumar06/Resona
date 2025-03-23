from django.urls import path
from .views import save_audio
from . import views

urlpatterns = [
    path('save-audio', save_audio, name='save_audio'),
    path('blockchain/', views.display_blockchain, name='display_blockchain'),
    path('user-watermark/', views.get_user_watermark, name='get_user_watermark'),
]
