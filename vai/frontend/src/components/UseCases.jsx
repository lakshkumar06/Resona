import React from 'react'

const UseCases = () => {
  return (
    <div className='py-[50px]'>
            <h2 className="text-[48px] font-bold text-white text-center">Use Cases</h2>

    <div className='grid grid-cols-4 text-white px-[2vw] pt-[40px]'>
      <div className="px-[2vw] border-r-[1px] border-[white] py-[30px]">
      <svg viewBox="0 0 24 24" className='h-[3em] w-[3em]' fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10.0376 5.31617L10.6866 6.4791C11.2723 7.52858 11.0372 8.90532 10.1147 9.8278C10.1147 9.8278 10.1147 9.8278 10.1147 9.8278C10.1146 9.82792 8.99588 10.9468 11.0245 12.9755C13.0525 15.0035 14.1714 13.8861 14.1722 13.8853C14.1722 13.8853 14.1722 13.8853 14.1722 13.8853C15.0947 12.9628 16.4714 12.7277 17.5209 13.3134L18.6838 13.9624C20.2686 14.8468 20.4557 17.0692 19.0628 18.4622C18.2258 19.2992 17.2004 19.9505 16.0669 19.9934C14.1588 20.0658 10.9183 19.5829 7.6677 16.3323C4.41713 13.0817 3.93421 9.84122 4.00655 7.93309C4.04952 6.7996 4.7008 5.77423 5.53781 4.93723C6.93076 3.54428 9.15317 3.73144 10.0376 5.31617Z" fill="#e042ff"></path> </g></svg>
        <p className="text-[20px] font-bold">1. Call Monitoring & Voice Verification</p>
        <p className="text-[18px] font-light pt-[0.5em]">Monitors calls in real-time, verifying each voice to prevent deepfakes or impersonations. Suspicious activity triggers alerts for further verification.</p>
      </div>
      <div className="px-[2vw] border-r-[1px] border-[white] py-[30px]">
        <p className="text-[20px] font-bold">2. LLM Deepfake Prevention Pipeline        </p>
        <p className="text-[18px] font-light pt-[0.5em]">Ensures any LLM generating synthetic voices checks against watermarks to prevent creating deepfakes of owned voices.</p>
      </div>
      <div className="px-[2vw] border-r-[1px] border-[white] py-[30px]">
        <p className="text-[20px] font-bold">3. Legal Contracts & Voice Signatures</p>
        <p className="text-[18px] font-light pt-[0.5em]">Verifies voice signatures in legal contracts, ensuring the authenticity of verbal agreements and preventing fraud</p>
      </div>
      <div className="px-[2vw]">
        <p className="text-[20px] font-bold py-[30px]">4. Content Creator Protection</p>
        <p className="text-[18px] font-light pt-[0.5em]">Protects content creators by embedding watermarks in audio, allowing them to track unauthorized use or distribution of their content.







</p>
      </div>
    </div>
    </div>
  )
}

export default UseCases
