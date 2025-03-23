import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const Signup = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cpassword, setCPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Get the CSRF token from the cookie (assuming you're using Django)
  const getCSRFToken = () => {
    const name = 'csrftoken=';
    const value = document.cookie.split('; ').find(row => row.startsWith(name))?.split('=')[1];
    return value;
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== cpassword) {
      setError("Passwords don't match.")
      return
    }

    const userData = {
      name,
      email,
      password,
      password2: cpassword
    }

    try {
      const csrfToken = getCSRFToken()
      
      const response = await axios.post('/auth/register', userData, {
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,  // Include CSRF token in request headers
        }
      })
      
      if (response.status === 201) {
        navigate('/Dashboard')
      }
    } catch (err) {
      console.error("Registration failed:", err.response.data)
      setError('Registration failed. Please try again.')
    }
  }

  return (
    <div className='flex'>
      <div className="w-1/2 p-[5vw] flexCol h-screen">
        <form onSubmit={handleSubmit} className="text-white font-redhat LoginSignupForm text-[20px] ">
          <h2 className="text-[36px] text-white pb-[1em] font-medium">Sign Up</h2>

          {error && <p className="text-red-500">{error}</p>} 

          <label htmlFor="name">Name:</label><br />
          <input 
            type="text" 
            name='name' 
            className='w-full px-[20px] py-[10px]' 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          /><br />

          <label htmlFor="email">Email:</label><br />
          <input 
            type="email" 
            name='email' 
            className='w-full px-[20px] py-[10px]' 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          /><br />

          <label htmlFor="password">Password:</label><br />
          <input 
            type="password" 
            name='password' 
            className='w-full px-[20px] py-[10px]' 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          /><br />

          <label htmlFor="cpassword">Confirm Password:</label><br />
          <input 
            type="password" 
            name='cpassword' 
            className='w-full px-[20px] py-[10px]' 
            value={cpassword} 
            onChange={(e) => setCPassword(e.target.value)} 
          />

          <div className="flex justify-end">
            <input 
              type="submit" 
              value="Submit" 
              className='px-[40px] py-[10px] bg-white text-black' 
            />
          </div>
        </form>
      </div>

      <div className="w-1/2 bg-black h-screen flexCol p-[5vw] text-white">
        <h2 className="text-[36px] text-white font-medium">Already a Member?</h2>
        <Link to='/login' className='underline text-[20px] font-light pt-[0.5em]'>Login</Link>
      </div>
    </div>
  )
}

export default Signup
