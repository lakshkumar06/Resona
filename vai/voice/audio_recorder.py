import sounddevice as sd
import numpy as np
import wave

class AudioRecorder:
    def __init__(self, duration=5, samplerate=44100):
        self.duration = duration
        self.samplerate = samplerate
        self.audio_data = b""

    def record(self):
        print("Recording...")
        audio = sd.rec(int(self.duration * self.samplerate), samplerate=self.samplerate, channels=1, dtype=np.int16)
        sd.wait()
        self.audio_data = audio.tobytes()
        print("Recording complete")