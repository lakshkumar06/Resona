import React from 'react'
import { Link } from 'react-router-dom'

const Header = () => {
  return (
    <div className='pt-[2.5vw] px-[5vw] flex justify-between w-screen text-white absolute z-100'>
        <div className="">
            <h2 className="text-[30px] font-black">LOGO</h2>
        </div>
        <div className="flex gap-[2vw] text-[20px]">
            <Link to="/Login"  className=''>Login</Link>
            <Link to="/Signup"  className=''>Sign Up</Link>
        </div>
      
    </div>
  )
}

export default Header
