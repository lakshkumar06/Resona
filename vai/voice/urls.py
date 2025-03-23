from django.urls import path
from .views import Audio

urlpatterns = [
    path('save-audio/', Audio.save_audio, name='save_audio'),
    path('clear-audio/', Audio.clear_audio, name='clear_audio'),
    path('create-watermark/', Audio.create_watermark, name='create_watermark'),
    path('test-watermark/', Audio.test_watermark, name='test_watermark'),
    path('blockchain/', Audio.display_blockchain, name='display_blockchain'),
    path('user-watermark/', Audio.get_user_watermark, name='get_user_watermark'),
]
