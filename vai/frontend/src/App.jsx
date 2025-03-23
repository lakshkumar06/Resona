import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Homepage from './pages/Homepage';
import Transcribe from './pages/Transcribe';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Authenticate from './pages/Authenticate';
const App = () => {
  return (
    <div className='font-redhat'>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Homepage/>}/>
          <Route path='/Dashboard' element={<Dashboard/>}/>
          <Route path='/Signup' element={<Signup/>}/>
          <Route path='/Login' element={<Login/>}/>
          <Route path='/Authenticate' element={<Authenticate/>}/>

          <Route path='/Transcribe' element={<Transcribe/>}/>
          <Route path='/Upload' element={<Upload/>}/>

        </Routes>
      </BrowserRouter>
      
    </div>
  )
}

export default App
