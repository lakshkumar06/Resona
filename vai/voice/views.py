from django.shortcuts import render
import os
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .utils import record_audio_for_user

def home(request):
    return render(request, 'record.html')

def record_audio(request):
    if request.method == "POST":
        username = request.POST.get("name")
        if username:
            user_dir = record_audio_for_user(username)
            return JsonResponse({"message": "Recording complete", "path": user_dir})
    return JsonResponse({"error": "Invalid request"}, status=400)
