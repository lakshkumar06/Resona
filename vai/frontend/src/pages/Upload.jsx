
import React, { useState, useRef, useEffect } from 'react';
import * as d3 from "d3";
import axios from 'axios';

const Upload = () => {
  const [recording, setRecording] = useState(false); 
  const [animationLevel, setAnimationLevel] = useState(0); 
  const [nextCount, setNextCount] = useState(0); 
  const [doneClicked, setDoneClicked] = useState(false); // Track if Done button is clicked
  const [statusText, setStatusText] = useState(""); // For the text carousel

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);





  const sendAudioToServer = async (blob) => {
    const formData = new FormData();

    // Create a File object from the blob, preserving the WAV format
    const audioFile = new File([blob], "recorded_audio.wav", { type: "audio/wav" });
    formData.append("audio", audioFile);  // Key must match server expectation
    formData.append("username", "testuser");

    try {
        const response = await axios.post("/voice/save-audio", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        console.log("Server response:", response.data);
    } catch (error) {
        console.error("Error uploading audio:", error);
    }
};
  // Handle recording logic



  useEffect(() => {
    if (recording) {
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



const handleNextClick = async () => {
  if (nextCount < 10) {
    setNextCount(nextCount + 1);
    
    if (mediaRecorderRef.current) {
      const chunks = [];
      const mediaRecorder = new MediaRecorder(mediaRecorderRef.current);
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/mp3" });
        await sendAudioToServer(blob);
      };

      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
      }, 5000); // Adjust duration as needed
    }
  }
  else if (nextCount === 10) {
    setNextCount(11); // Set nextCount to 11 after the 10th click
    setRecording(false); // Stop the recording after the 10th sentence
    // Stop the mediaRecorder and close the audio context if recording is stopped
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }
};


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

  // // Handle Done Button Click (Function to take user to homepage)
  // const handleDoneClick = () => {
  //   // This function can be used to navigate to the homepage or perform any other action.
  //   window.location.href = "/"; // Example of redirecting to homepage
  // };




  const handleDoneClick = async () => {
    setDoneClicked(true); // Set doneClicked to true to show the blob and carousel
    let statusMessages = ["Initializing", "Analyzing", "Creating Watermark", "Redirecting"];
    let currentMessageIndex = 0;
  
    const interval = setInterval(() => {
      setStatusText(statusMessages[currentMessageIndex]);
      currentMessageIndex++;
      if (currentMessageIndex >= statusMessages.length) {
        clearInterval(interval); // Clear the interval after all messages are shown
        setTimeout(() => {
          // Trigger the server-side watermark creation API
          createWatermarkOnServer();
  
          // Redirect to the dashboard after a short delay
          window.location.href = "/Dashboard"; // Redirect to homepage
        }, 2000); // Delay the redirect to let the user see "Redirecting"
      }
    }, 2500); // Show each message for 2 seconds
  };
  
  const createWatermarkOnServer = async () => {
    const username = "testuser";  // You can replace this with actual user data
    try {
      const response = await fetch('/voice/create-watermark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }), // Send the username or any required data
      });
  
      const data = await response.json();
      if (response.ok) {
        console.log("Watermark created and stored successfully:", data);
      } else {
        console.error("Error creating watermark:", data.error);
      }
    } catch (error) {
      console.error("Error while calling the create watermark API:", error);
    }
  };
  

  return (
    <div className='px-[10vw] pt-[10vh]  pb-[5vh] h-screen flex flex-col justify-between text-white'>

        <div className="">
          {/* Display instructions and heading based on the nextCount */}
          {nextCount < 11 && (
            <>
              <h2 className="text-[32px] font-bold text-center text-white">
                {recording ? 'Say the following sentence' : 'Upload'}
              </h2>
              {!recording && (
                <div className='w-[40%] mx-auto'>
                  <p className="font-bold text-white text-[24px] pt-[2em]">Instructions</p>
                  <ol className="text-[#A3A3A3] text-[20px] list-decimal pt-[1em]">
                    <li>The screen will display a random sentence</li>
                    <li>Say the sentence aloud 10 times</li>
                    <li>Click the "Next" button after each time</li>
                  </ol>
                </div>
              )}
            </>
          )}

          {recording && nextCount < 11 && (
            <p className="text-[22px] font-medium text-[#B7B7B7] text-center mt-[1em]">"Technology has transformed the way we communicate, learn, and interact with the world. From smartphones to artificial intelligence, it shapes our daily lives and influences our decisions."</p>
          )}
        </div>

        {/* Recording circle */}
        {recording && nextCount < 11 && (
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
{doneClicked && (
  <div className="flex flex-col justify-center items-center">
    <div class="loader"></div>
    <p className="text-[24px] font-bold text-white mt-7 fade-animation h-[29px]" key={statusText}>
      {statusText}
    </p>
  </div>
)}
        <div className="">
          <div className="mx-auto w-fit flex gap-[3vw]">

          {recording && nextCount < 10 && (
            <div className="">
            <button
                onClick={() => setRecording(!recording)}
                className="mx-auto aspect-square px-[20px] bg-white rounded-[100px] relative bottom-0 flexCol"
              ><svg className='h-[30px] w-[30px]' viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.30563 15.2187C0.898125 15.6263 0.898125 16.2869 1.30563 16.6944C1.71313 17.1019 2.37383 17.1019 2.78133 16.6944L1.30563 15.2187ZM9.73783 9.73783C10.1453 9.33031 10.1453 8.66972 9.73783 8.2622C9.33031 7.85469 8.66972 7.85469 8.2622 8.2622L9.73783 9.73783ZM8.2622 8.2622C7.85469 8.66972 7.85469 9.33031 8.2622 9.73783C8.66972 10.1453 9.33031 10.1453 9.73783 9.73783L8.2622 8.2622ZM16.6944 2.78133C17.1019 2.37383 17.1019 1.71313 16.6944 1.30563C16.2869 0.898125 15.6263 0.898125 15.2187 1.30563L16.6944 2.78133ZM9.73783 8.2622C9.33031 7.85469 8.66972 7.85469 8.2622 8.2622C7.85469 8.66972 7.85469 9.33031 8.2622 9.73783L9.73783 8.2622ZM15.2187 16.6944C15.6263 17.1019 16.2869 17.1019 16.6944 16.6944C17.1019 16.2869 17.1019 15.6263 16.6944 15.2187L15.2187 16.6944ZM8.2622 9.73783C8.66972 10.1453 9.33031 10.1453 9.73783 9.73783C10.1453 9.33031 10.1453 8.66972 9.73783 8.2622L8.2622 9.73783ZM2.78133 1.30563C2.37383 0.898125 1.71313 0.898125 1.30563 1.30563C0.898125 1.71313 0.898125 2.37383 1.30563 2.78133L2.78133 1.30563ZM2.78133 16.6944L9.73783 9.73783L8.2622 8.2622L1.30563 15.2187L2.78133 16.6944ZM9.73783 9.73783L16.6944 2.78133L15.2187 1.30563L8.2622 8.2622L9.73783 9.73783ZM8.2622 9.73783L15.2187 16.6944L16.6944 15.2187L9.73783 8.2622L8.2622 9.73783ZM9.73783 8.2622L2.78133 1.30563L1.30563 2.78133L8.2622 9.73783L9.73783 8.2622Z" fill="#FF8000"/>
            </svg></button>
            <p className="text-center text-[20px] font-semibold mt-[0.5em]">Stop</p>

          </div>)}

          {!recording && nextCount < 10 && (
            <div className="">
            <button
                onClick={() => {
                  setRecording(!recording);  // Toggle recording state
                }}
                className="mx-auto aspect-square px-[20px] bg-white rounded-[100px] relative bottom-0 flexCol"
              >    <svg className='h-[30px] w-[30px]' viewBox="0 0 18 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.4286 4.42857C12.4286 2.53502 10.8936 1 9.00001 1C7.10647 1 5.57144 2.53502 5.57144 4.42857V10.1429C5.57144 12.0364 7.10647 13.5714 9.00001 13.5714C10.8936 13.5714 12.4286 12.0364 12.4286 10.1429V4.42857Z" stroke="#FF6600" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M1 10.1429C1 12.2646 1.84286 14.2994 3.34314 15.7997C4.84344 17.3 6.87829 18.1429 9 18.1429C11.1217 18.1429 13.1566 17.3 14.6568 15.7997C16.1571 14.2994 17 12.2646 17 10.1429" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 21.5714V19.2857" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg></button>
            <p className="text-center text-[20px] font-semibold mt-[0.5em]">Start</p>

          </div>)}


            {/* Next Button */}
            {recording && nextCount < 11 && (
              <div>
                <button onClick={handleNextClick } className="mx-auto aspect-square px-[20px] bg-white rounded-[100px] relative bottom-0 flexCol">
                  <svg className='h-[30px] w-[30px]' viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 8.10118L6.94953 13.0505L18 2" stroke="#FF8000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <p className="text-center text-[20px] font-semibold mt-[0.5em]">Next</p>
              </div>
            )}


          {!recording && nextCount > 0 && nextCount<10 && (
              <div>
                <button onClick={()=>setNextCount(0) } className="mx-auto aspect-square px-[20px] bg-white rounded-[100px] relative bottom-0 flexCol">
                <svg className='h-[30px] w-[30px]' viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" fill="#FF8000" stroke="#FF8000" stroke-width="2.1"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g fill="none" fill-rule="evenodd" stroke="FF8000" stroke-linecap="round" stroke-linejoin="round" transform="translate(2 2)"> <path d="m4.5 1.5c-2.4138473 1.37729434-4 4.02194088-4 7 0 4.418278 3.581722 8 8 8s8-3.581722 8-8-3.581722-8-8-8"></path> <path d="m4.5 5.5v-4h-4"></path> </g> </g></svg>
                 
                </button>
                <p className="text-center text-[20px] font-semibold mt-[0.5em]">Reset</p>
              </div>
            )}
          </div>


          


      {/* Done Button */}
{nextCount === 11 && !recording && !doneClicked && (
        <div className="mx-auto w-fit animate-grow">
          <button
            onClick={handleDoneClick}
            className="mx-auto aspect-square px-[20px] bg-white rounded-[100px] relative bottom-0 flexCol cursor-pointer"
          >
            <svg className="h-[30px] w-[30px]" viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 8.10118L6.94953 13.0505L18 2" stroke="#FF8000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <p className="text-center text-[20px] font-semibold mt-[0.5em]">Done</p>
        </div>
      )}
        <div className="h-[8px] w-full mt-[30px]">
          {/* Loading bar */}
          {nextCount>=0  && nextCount<11 && !doneClicked &&(
            <div className="flex gap-2 justify-center w-full">
              {Array.from({ length: 10 }, (_, index) => (
                <div key={index} className="w-full h-[8px] rounded-full bg-[#3F3F3F] relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-white rounded-full"
                    style={{
                      width: `${index < nextCount ? '100%' : '0%'}`,
                      transition: '0.4s ease-out',
                    }}
                  ></div>
                </div>
              ))}
            </div>
          )}
                  </div>

        </div>
    </div>
  );
};

export default Upload;



