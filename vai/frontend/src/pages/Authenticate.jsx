import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Importing navigate to move to the next page
import * as d3 from "d3";
import axios from 'axios'; // We will use axios to make API calls

const Authenticate = () => {
  const [recording, setRecording] = useState(false); // Recording state
  const [animationLevel, setAnimationLevel] = useState(0); // Animation level for the circle
  const [errorMessage, setErrorMessage] = useState(''); // For displaying errors
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const navigate = useNavigate(); // Navigate function to transition between pages

  // Handle recording logic
  useEffect(() => {
    if (recording) {
      // Start recording
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);

        const detectSound = () => {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          const volume = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
          setAnimationLevel(volume * 1.5);
          if (recording) requestAnimationFrame(detectSound);
        };
        detectSound();

        mediaRecorderRef.current = stream;
      });
    } else {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current = null;
      }
    }
  }, [recording]);

  // Generate a dynamic blob shape with smooth curves
  const generateBlobPath = (level) => {
    const r = 60 + level * 0.4;
    const points = 10;
    const angleStep = (Math.PI * 2) / points;
    let pathData = [];

    for (let i = 0; i < points; i++) {
      const angle = i * angleStep;
      const radius = r + Math.sin(i * 2 + level * 0.05) * 2;
      const x = Math.cos(angle) * radius + 64;
      const y = Math.sin(angle) * radius + 64;
      pathData.push([x, y]);
    }

    const lineGenerator = d3
      .line()
      .curve(d3.curveCatmullRomClosed)
      .x((d) => d[0])
      .y((d) => d[1]);

    return lineGenerator(pathData);
  };

  // Function to handle stop recording, send data to backend, and navigate to the next page
  const handleStopRecording = () => {
    setRecording(false); // Stop recording

    // Get the audio data from the media recorder
    const audioBlob = mediaRecorderRef.current ? mediaRecorderRef.current : null;
    if (!audioBlob) {
      setErrorMessage("No audio recorded");
      return;
    }

    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav");

    // Send the recorded audio to the server for authentication
    axios.post('/your-api-endpoint/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((response) => {
      if (response.data.message === "Authentication successful") {
        // Redirect to transcribe page if authentication is successful
        navigate('/transcribe');
      } else {
        setErrorMessage("Authentication failed");
      }
    })
    .catch((error) => {
      console.error("Error during authentication:", error);
      setErrorMessage("Authentication failed");
    });
  };

  return (
    <div className="bg-[#101010] h-screen">
        <div className="flex justify-center items-center h-[90vh] bg-[#101010]">
      <div className="w-[80%] md:w-[50%] bg-black p-8 rounded-xl text-center text-white">
        <h2 className="text-[32px] font-bold mb-4">Authentication</h2>
        <p className="text-lg mb-4">Please say the following sentence:</p>
        <p className="text-[24px] font-semibold">"Technology has transformed the way we communicate, learn, and interact with the world. From smartphones to artificial intelligence, it shapes our daily lives and influences our decisions."</p>

        {/* Dynamic blob animation */}
        <div className="flex justify-center items-center mt-8">
          <svg className="h-[128px] w-[128px] overflow-visible" viewBox="0 0 128 128">
            <defs>
              <linearGradient id="blobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF6600" />
                <stop offset="100%" stopColor="#FFCC00" />
              </linearGradient>
            </defs>
            <path d={generateBlobPath(animationLevel)} fill="url(#blobGradient)" />
          </svg>
        </div>

        {/* Start/Stop Recording Button */}
        <button
          onClick={() => {
            if (recording) {
              handleStopRecording(); // Stop recording and navigate when clicked
            } else {
              setRecording(true); // Start recording when clicked
            }
          }}
          className="mt-6 p-4 bg-orange-500 text-white rounded-full"
        >
          {recording ? 'Stop Recording' : 'Start Recording'}
        </button>

        {/* Display error message if authentication fails */}
        {errorMessage && (
          <div className="text-red-500 mt-4">
            <p>{errorMessage}</p>
          </div>
        )}
      </div>
      </div>

      <div className=" ">
<div className="flex">
    <button className=' w-[50%] h-[10vh] cursor-pointer right-0 '>No</button>
 <button className="w-[50%] cursor-pointer h-[10vh] left-0 ">Yes</button>

</div>
</div>
    </div>
  );
};

export default Authenticate;