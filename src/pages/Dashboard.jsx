import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserLanding from '../components/ui/UserLanding'

const Dashboard = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || token === 'null' || token === 'undefined') {
      navigate('/user/signin', { replace: true })
    }
  }, [navigate])

  return (
    <div>
      <UserLanding />
    </div>
  )
}

export default Dashboard