import React from 'react'
import HomepageBL from '../components/HomepageBL'
import Header from '../components/Header'
import HeroHomepage from '../components/HeroHomepage'
import WhyMatters from '../components/WhyMatters'
import UseCases from '../components/UseCases'
import Process from '../components/Process'
const Homepage = () => {
  return (
    <div>
      <Header/>
      <HeroHomepage/>
      <WhyMatters/>
      <UseCases/>
      <Process/>
    </div>
  )
}

export default Homepage
