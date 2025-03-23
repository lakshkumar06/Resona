import React from 'react'
import { Link } from 'react-router-dom'
const HomepageBL = () => {
  return (
    <div className='px-[20%] pt-[20vh]'>
       

        <div className="flex gap-[5vw] mt-[50px]">
            <Link to="/Signup" className="bg-white text-black rounded-[20px] w-1/2 text-center py-[40px] flexCol hover:bg-[#909090] transition-[0.2s]">

            <p className="text-[24px] mt-[10px] font-medium">Signup</p>

            </Link>
            <Link to="/Login" className="bg-white text-black rounded-[20px] w-1/2 text-center py-[40px] flexCol hover:bg-[#909090] transition-[0.2s]">
            

            <p className="text-[24px] mt-[10px] font-medium">Login</p>

            </Link>
        </div>

    </div>
  )
}

export default HomepageBL
