import { useEffect, useState } from 'react'
import './App.css'
import { api } from './api'

function App() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    api
      .get('/health')
      .then((r) => setStatus(r.data.status))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1>Stonklytics</h1>
      <p>Backend health: {status}</p>
    </div>
  )
}

export default App
