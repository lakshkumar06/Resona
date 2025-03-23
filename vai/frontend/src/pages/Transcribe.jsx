import React, { useState, useRef, useEffect } from 'react';
import * as d3 from "d3";

const Transcribe = () => {
  const [recording, setRecording] = useState(false); // Recording state
  const [animationLevel, setAnimationLevel] = useState(0); // Animation level for the circle
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);

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
  
        // Store the stream so that we can stop it later
        mediaRecorderRef.current = stream;
      });
    } else {
      // Stop recording
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
  
      // Stop the media stream to ensure no audio is captured
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current = null;
      }
    }
  }, [recording]);
  
  // Generate a dynamic blob shape with smooth curves
const generateBlobPath = (level) => {
    const r = 60 + level * 0.4; // Base radius with deformation
    const points = 10; // Number of control points
    const angleStep = (Math.PI * 2) / points;
    let pathData = [];
  
    for (let i = 0; i < points; i++) {
      const angle = i * angleStep;
      const radius = r + Math.sin(i * 2 + level * 0.05) * 2; // Creates a wavy effect
      const x = Math.cos(angle) * radius + 64; // Centering at 64,64
      const y = Math.sin(angle) * radius + 64;
      pathData.push([x, y]);
    }
  
    // Use d3.line to interpolate with cardinal curve (smooths out corners)
    const lineGenerator = d3
      .line()
      .curve(d3.curveCatmullRomClosed) // Smooth curved shape
      .x((d) => d[0])
      .y((d) => d[1]);
  
    return lineGenerator(pathData); // Returns the smooth SVG path
  };
  
  return (
    <div className='flex'>
      <div className="Recording w-[40%] bg-black px-[5vw] text-white py-[10vh] h-screen flex flex-col justify-between  ">
        {/* Conditional rendering for instructions and recording */}
        <div className="">
        <h2 className="text-[32px] font-bold text-center"> {recording ? 'Recording' : 'Transcribe'} </h2>

        {!recording && (
          <>
            <p className="font-bold text-white text-[24px] pt-[2em]">Instructions</p>
            <ol className="text-[#A3A3A3] text-[20px] list-decimal pt-[1em]">
              <li>Upload a voice memo to check if it contains a watermark.</li>
              <li>If the voice is signatured, it cannot be transcribed!</li>
            </ol>
          </>
        )}     </div>
{/* Recording circle */}


{recording && (
    <div className="flex justify-center items-center">
    <svg className='h-[128px] w-[128px] overflow-visible' viewBox="0 0 128 128">
    <defs>
    <linearGradient id="blobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FF6600" />  {/* Start color */}
      <stop offset="100%" stopColor="#FFCC00" /> {/* End color */}
    </linearGradient>
  </defs>

  <path d={generateBlobPath(animationLevel)} fill="url(#blobGradient)" />
    </svg>
  </div>
      )}
  
        <div className="mx-auto w-fit ">
          {/* Button to toggle recording */}
          <button
            onClick={() => setRecording(!recording)}
            className="mx-auto aspect-square px-[20px] bg-white rounded-[100px] relative bottom-0 flexCol"
          >
            {/* Display different icons based on recording state */}
            {recording ? (
              
              <svg className='h-[30px] w-[30px]' viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.30563 15.2187C0.898125 15.6263 0.898125 16.2869 1.30563 16.6944C1.71313 17.1019 2.37383 17.1019 2.78133 16.6944L1.30563 15.2187ZM9.73783 9.73783C10.1453 9.33031 10.1453 8.66972 9.73783 8.2622C9.33031 7.85469 8.66972 7.85469 8.2622 8.2622L9.73783 9.73783ZM8.2622 8.2622C7.85469 8.66972 7.85469 9.33031 8.2622 9.73783C8.66972 10.1453 9.33031 10.1453 9.73783 9.73783L8.2622 8.2622ZM16.6944 2.78133C17.1019 2.37383 17.1019 1.71313 16.6944 1.30563C16.2869 0.898125 15.6263 0.898125 15.2187 1.30563L16.6944 2.78133ZM9.73783 8.2622C9.33031 7.85469 8.66972 7.85469 8.2622 8.2622C7.85469 8.66972 7.85469 9.33031 8.2622 9.73783L9.73783 8.2622ZM15.2187 16.6944C15.6263 17.1019 16.2869 17.1019 16.6944 16.6944C17.1019 16.2869 17.1019 15.6263 16.6944 15.2187L15.2187 16.6944ZM8.2622 9.73783C8.66972 10.1453 9.33031 10.1453 9.73783 9.73783C10.1453 9.33031 10.1453 8.66972 9.73783 8.2622L8.2622 9.73783ZM2.78133 1.30563C2.37383 0.898125 1.71313 0.898125 1.30563 1.30563C0.898125 1.71313 0.898125 2.37383 1.30563 2.78133L2.78133 1.30563ZM2.78133 16.6944L9.73783 9.73783L8.2622 8.2622L1.30563 15.2187L2.78133 16.6944ZM9.73783 9.73783L16.6944 2.78133L15.2187 1.30563L8.2622 8.2622L9.73783 9.73783ZM8.2622 9.73783L15.2187 16.6944L16.6944 15.2187L9.73783 8.2622L8.2622 9.73783ZM9.73783 8.2622L2.78133 1.30563L1.30563 2.78133L8.2622 9.73783L9.73783 8.2622Z" fill="#FF8000"/>
              <path d="M1.30563 15.2187C0.898125 15.6263 0.898125 16.2869 1.30563 16.6944C1.71313 17.1019 2.37383 17.1019 2.78133 16.6944M1.30563 15.2187L2.78133 16.6944M1.30563 15.2187L8.2622 8.2622M2.78133 16.6944L9.73783 9.73783M9.73783 9.73783C10.1453 9.33031 10.1453 8.66972 9.73783 8.2622M9.73783 9.73783L8.2622 8.2622M9.73783 9.73783C9.33031 10.1453 8.66972 10.1453 8.2622 9.73783M9.73783 9.73783L16.6944 2.78133M9.73783 8.2622C9.33031 7.85469 8.66972 7.85469 8.2622 8.2622M9.73783 8.2622L8.2622 9.73783M9.73783 8.2622L16.6944 15.2187M9.73783 8.2622L2.78133 1.30563M8.2622 8.2622C7.85469 8.66972 7.85469 9.33031 8.2622 9.73783M8.2622 8.2622L15.2187 1.30563M8.2622 9.73783L15.2187 16.6944M8.2622 9.73783L1.30563 2.78133M16.6944 2.78133C17.1019 2.37383 17.1019 1.71313 16.6944 1.30563C16.2869 0.898125 15.6263 0.898125 15.2187 1.30563M16.6944 2.78133L15.2187 1.30563M15.2187 16.6944C15.6263 17.1019 16.2869 17.1019 16.6944 16.6944C17.1019 16.2869 17.1019 15.6263 16.6944 15.2187M15.2187 16.6944L16.6944 15.2187M2.78133 1.30563C2.37383 0.898125 1.71313 0.898125 1.30563 1.30563C0.898125 1.71313 0.898125 2.37383 1.30563 2.78133M2.78133 1.30563L1.30563 2.78133" stroke="#FF8000" stroke-width="0.5"/>
              </svg>
              
              
            ) : (
              <svg className='h-[30px] w-[30px]' viewBox="0 0 18 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.4286 4.42857C12.4286 2.53502 10.8936 1 9.00001 1C7.10647 1 5.57144 2.53502 5.57144 4.42857V10.1429C5.57144 12.0364 7.10647 13.5714 9.00001 13.5714C10.8936 13.5714 12.4286 12.0364 12.4286 10.1429V4.42857Z" stroke="#FF6600" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M1 10.1429C1 12.2646 1.84286 14.2994 3.34314 15.7997C4.84344 17.3 6.87829 18.1429 9 18.1429C11.1217 18.1429 13.1566 17.3 14.6568 15.7997C16.1571 14.2994 17 12.2646 17 10.1429" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 21.5714V19.2857" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <p className="text-center text-[20px] font-semibold mt-[0.5em]">{recording ?'Stop': 'Start'}</p>

          
        </div>
       
      </div>


      <div className="Transcription w-[60%] px-[5vw] text-white py-[10vh] h-screen">
        <h2 className="text-[30px] text-left">Transcribed Text:</h2>

        <textarea className="resize-none w-full h-[60vh] bg-black rounded-[20px] my-[2em] p-[2em] text-[20px] align-text-top" />

        <div className="text-[#BE6207]">This voice is watermarked and is not owned by you.</div>
      </div>

      
    </div>
  );
};

export default Transcribe;
