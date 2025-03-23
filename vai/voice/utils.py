import os
from .audio_recorder import AudioRecorder

def record_audio_for_user(username): 
    """Record audio samples for the given user and save them."""
    base_dir = 'Data'
    user_dir = os.path.join(base_dir, username)

    if not os.path.exists(user_dir):
        os.makedirs(user_dir)

    tech_statement = (
        "Technology has transformed the way we communicate, learn, and interact with the world. "
        "From smartphones to artificial intelligence, it shapes our daily lives and influences our decisions."
    )

    print(f"Please read the following statement:\n\"{tech_statement}\"")

    num_samples = 10
    recorder = AudioRecorder()
    
    for i in range(num_samples):
        recorder.record()
        save_audio(os.path.join(user_dir, f'sample_{i+1}.wav'), recorder.audio_data)
        recorder.audio_data.clear()

    with open(os.path.join(base_dir, 'last_username.txt'), 'w') as f:
        f.write(username)
        
    return user_dir

def save_audio(filepath, audio_data):
    with open(filepath, 'wb') as f:
        f.write(audio_data)
