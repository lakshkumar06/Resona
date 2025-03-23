from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import os

@csrf_exempt
def save_audio(request):
    if request.method == "POST":

        username = request.user.name
        audio_file = request.FILES.get("audio")

        if not username or not audio_file:
            return JsonResponse({"error": "Missing username or audio file"}, status=400)

        user_dir = os.path.join("Data", username)
        os.makedirs(user_dir, exist_ok=True)

        file_path = os.path.join(user_dir, f"sample_{len(os.listdir(user_dir)) + 1}.wav")
        
        with open(file_path, "wb") as f:
            for chunk in audio_file.chunks():
                f.write(chunk)

        return JsonResponse({"message": "Audio saved", "file_path": file_path})

    return JsonResponse({"error": "Invalid request"}, status=400)
