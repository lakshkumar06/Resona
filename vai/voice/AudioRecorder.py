import sounddevice as sd

class AudioRecorder:
    def __init__(self, fs=16000):
        self.fs = fs
        self.recording = False
        self.audio_data = []

    def callback(self, indata, frames, time, status):
        """Callback function that gets called continuously while recording."""
        if self.recording:
            self.audio_data.append(indata.copy())

    def record(self):
        """Starts recording audio."""
        self.recording = True
        with sd.InputStream(samplerate=self.fs, channels=1, callback=self.callback):
            print("Recording... (Press Enter to stop)")
            input()  # Wait until Enter is pressed
            self.recording = False
