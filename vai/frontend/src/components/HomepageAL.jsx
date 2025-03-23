import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom'

const HomepageAL = () => {
  const [username, setUsername] = useState('');

  useEffect(() => {
    axios.get('auth/user', { withCredentials: true })
      .then(response => {
        setUsername(response.data.name);
      })
      .catch(error => {
        console.error('Error fetching session:', error);
      });
  }, []);

  return (
    <div className='px-[20%] pt-[20vh]'>
        <h2 className="text-[36px] text-white  font-medium">Hey {username},</h2>
        <p className="text-[24px] text-[#959595] pt-[10px]">What are we doing today?</p>

        <div className="flex gap-[5vw] mt-[50px]">
            <Link to="/Upload" className="bg-white text-black rounded-[20px] w-1/2 text-center py-[40px] flexCol hover:bg-[#909090] transition-[0.2s]">
            <svg className='h-[50px] mx-auto' viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.15842 29.1291C4.15842 28.0067 3.22751 27.0968 2.07921 27.0968C0.930903 27.0968 0 28.0067 0 29.1291H4.15842ZM42 29.1291C42 28.0067 41.0691 27.0968 39.9208 27.0968C38.7725 27.0968 37.8416 28.0067 37.8416 29.1291H42ZM22.6395 3.28223C23.3456 2.39725 23.1843 1.12021 22.2789 0.429897C21.3734 -0.260392 20.0669 -0.102553 19.3605 0.782453L22.6395 3.28223ZM8.54865 14.3308C7.84241 15.2158 8.0039 16.4928 8.90935 17.1832C9.81478 17.8734 11.1213 17.7157 11.8276 16.8307L8.54865 14.3308ZM22.6395 0.782453C21.9331 -0.102553 20.6266 -0.260392 19.7211 0.429897C18.8157 1.12021 18.6544 2.39725 19.3605 3.28223L22.6395 0.782453ZM30.1724 16.8307C30.8787 17.7157 32.1853 17.8734 33.0907 17.1832C33.9962 16.4928 34.1575 15.2158 33.4514 14.3308L30.1724 16.8307ZM23.0792 2.03234C23.0792 0.90997 22.1483 8.92436e-05 21 8.92436e-05C19.8517 8.92436e-05 18.9208 0.90997 18.9208 2.03234H23.0792ZM18.9208 31.8387C18.9208 32.9611 19.8517 33.871 21 33.871C22.1483 33.871 23.0792 32.9611 23.0792 31.8387H18.9208ZM0 29.1291V31.8387H4.15842V29.1291H0ZM0 31.8387C0 37.402 4.51208 42 10.1881 42V37.9355C6.90732 37.9355 4.15842 35.2548 4.15842 31.8387H0ZM10.1881 42H31.8119V37.9355H10.1881V42ZM31.8119 42C37.4878 42 42 37.402 42 31.8387H37.8416C37.8416 35.2548 35.0926 37.9355 31.8119 37.9355V42ZM42 31.8387V29.1291H37.8416V31.8387H42ZM19.3605 0.782453L8.54865 14.3308L11.8276 16.8307L22.6395 3.28223L19.3605 0.782453ZM19.3605 3.28223L30.1724 16.8307L33.4514 14.3308L22.6395 0.782453L19.3605 3.28223ZM18.9208 2.03234V31.8387H23.0792V2.03234H18.9208Z" fill="black"/>
            </svg>
            <p className="text-[24px] mt-[10px] font-medium">Upload</p>

            </Link>
            <Link to="/Transcribe" className="bg-white text-black rounded-[20px] w-1/2 text-center py-[40px] flexCol hover:bg-[#909090] transition-[0.2s]">
            <svg className='h-[50px] mx-auto' viewBox="0 0 44 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M18.7999 18.8C23.4391 18.8 27.1999 15.0392 27.1999 10.4C27.1999 5.76081 23.4391 2 18.7999 2C14.1607 2 10.3999 5.76081 10.3999 10.4C10.3999 15.0392 14.1607 18.8 18.7999 18.8Z" stroke="black" stroke-width="3.5"/>
<path d="M35.6 34.55C35.6 39.7691 35.6 44 18.8 44C2 44 2 39.7691 2 34.55C2 29.3308 9.52161 25.1 18.8 25.1C28.0784 25.1 35.6 29.3308 35.6 34.55Z" stroke="black" stroke-width="3.5"/>
<path d="M37.7 2C37.7 2 41.9 4.52 41.9 10.4C41.9 16.28 37.7 18.8 37.7 18.8" stroke="black" stroke-width="3.5" stroke-linecap="round"/>
<path d="M33.5 6.19995C33.5 6.19995 35.6 7.45995 35.6 10.4C35.6 13.34 33.5 14.6 33.5 14.6" stroke="black" stroke-width="3.5" stroke-linecap="round"/>
</svg>

            <p className="text-[24px] mt-[10px] font-medium">Transcribe</p>

            </Link>
        </div>

    </div>
  )
}

export default HomepageAL
