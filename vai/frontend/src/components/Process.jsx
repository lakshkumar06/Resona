// import React from 'react'

// const Process = () => {
//   return (
//     <div className='x-container bg-purple-500'>
//       <div className="flex">
//         <div className="w-1/2 h-screen flexCol">
            
//             <p className="">1. Audio Input</p>
//             <p className="">The system captures and processes voice data from calls, media, or LLM-generated audio.</p>

//         </div>
//         <div className="w-1/2">
//             <img src="/record.jpg" alt="" className="w-full h-full object-cover" />
//         </div>
        
//       </div>
//       <div className="flex">
//       <div className="w-1/2 h-screen flexCol">
            
//             <p className="">2. Watermark & Signature Check</p>
//             <p className="">Each audio file is scanned against a proprietary database of watermarks and voice signatures to detect ownership and authenticity.</p>

//         </div>
//         <div className="w-1/2">
//             <img src="/spectrogram.png" alt="" className="w-full h-full object-cover" />
//         </div>
//       </div>
//       <div className="flex">
//         <div className="w-1/2 h-screen flexCol">
            
//             <p className="">3. Deepfake Detection</p>
//             <p className="">Advanced AI models analyze speech patterns, tone, and frequency to identify synthetic voices or tampered audio.</p>

//         </div>
//         <div className="w-1/2">
//             <img src="/deepfake.png" alt="" className="w-full h-full object-cover" />
//         </div>
        
//       </div>
     
//     </div>
//   )
// }

// export default Process
import React, { useEffect, useState } from 'react';

const Process = () => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [imageSrc, setImageSrc] = useState(
    'https://liftoff.io/wp-content/uploads/2022/11/Vungle-exchange-homepage-content-block.svg'
  );

  const images = [
    'https://liftoff.io/wp-content/uploads/2022/11/Vungle-exchange-homepage-content-block.svg',
    'https://liftoff.io/wp-content/uploads/2022/11/Liftoff-monetize-home-page-1.svg',
    'https://liftoff.io/wp-content/uploads/2022/10/v2.png',
    'https://liftoff.io/wp-content/uploads/2022/11/Creative-studio-home-page-content-block-2.svg',
  ];

  const changeImage = (sectionIndex) => {
    if (sectionIndex >= 0 && sectionIndex < images.length) {
      setImageSrc(images[sectionIndex]);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionIndex = parseInt(entry.target.dataset.index);
          if (sectionIndex !== currentSectionIndex) {
            setCurrentSectionIndex(sectionIndex);
            changeImage(sectionIndex);
          }
        }
      });
    }, { threshold: 1 });

    const sections = document.querySelectorAll('.sections');
    sections.forEach((section, index) => {
      section.dataset.index = index;
      observer.observe(section);
    });

    // Clean up the observer when component unmounts
    return () => observer.disconnect();
  }, [currentSectionIndex]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex justify-between relative max-w-screen-xl w-full text-white">
        <div className="sections min-h-screen flex items-center justify-center">
          <p>test 1</p>
        </div>
        <div className="sections min-h-screen flex items-center justify-center">
          <p>test 2</p>
        </div>
        <div className="sections min-h-screen flex items-center justify-center">
          <p>test 3</p>
        </div>
        <div className="sections min-h-screen flex items-center justify-center">
          <p>test 4</p>
        </div>
      </div>

      <img
        className="w-100 h-100 sticky top-0 transition-opacity duration-200"
        src={imageSrc}
        alt="current-image"
      />
    </div>
  );
};

export default Process;
