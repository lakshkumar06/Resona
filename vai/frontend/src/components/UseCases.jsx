import React from 'react'

const UseCases = () => {
  return (
    <div className='py-[50px]'>
            <h2 className="text-[48px] font-bold text-white text-center">Use Cases</h2>

    <div className='grid grid-cols-4 text-white px-[2vw] pt-[40px]'>
      <div className="px-[2vw] border-r-[1px] border-[white] py-[30px]">
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
