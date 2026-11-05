import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './components/CartProvider'
import './styles/globals.css'
import { registerPwa } from './lib/pwa'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><BrowserRouter><CartProvider><App /></CartProvider></BrowserRouter></React.StrictMode>,
)

if (import.meta.env.PROD) registerPwa()
