import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate()


    // Get the CSRF token from the cookie (assuming you're using Django)
    const getCSRFToken = () => {
      const name = 'csrftoken=';
      const value = document.cookie.split('; ').find(row => row.startsWith(name))?.split('=')[1];
      return value;
    }
  const handleSubmit = async (e) => {
    e.preventDefault();

    const loginData = { email, password };

    try {
      const csrfToken = getCSRFToken()

      const response = await axios.post('/auth/login', loginData, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,  // Include CSRF token in request headers

        },
      });

      if (response.status === 200) {
        // Save the user info in localStorage or state
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Redirect to a different page after successful login (like the dashboard)
        navigate('/Dashboard')
      }
    } catch (error) {
      // Handle errors here
      if (error.response) {
        setError(error.response.data.message || 'Login failed');
      } else {
        setError('An error occurred');
      }
    }
  };

  return (
    <div className='flex'>
      <div className="w-1/2 bg-black h-screen flexCol p-[5vw] text-white">
        <h2 className="text-[36px] text-white font-medium">Not a Member Yet?</h2>
        <Link to='/Signup' className='underline text-[20px] font-light pt-[0.5em]'>Sign Up</Link>
      </div>
      <div className="w-1/2 p-[5vw] flexCol h-screen">
        <form onSubmit={handleSubmit} className="text-white font-redhat LoginSignupForm text-[20px] ">
          <h2 className="text-[36px] text-white pb-[1em] font-medium">Login</h2>

          {error && <p className="text-red-500">{error}</p>} {/* Error message display */}

          <label htmlFor="email">Email:</label><br />
          <input 
            type="email" 
            name="email" 
            className="w-full px-[20px] py-[10px]" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          /><br />

          <label htmlFor="password">Password:</label><br />
          <input 
            type="password" 
            name="password" 
            className="w-full px-[20px] py-[10px]" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          /><br />

          <div className="flex justify-end">
            <input type="submit" value="Submit" className="px-[40px] py-[10px] bg-white text-black" />
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
