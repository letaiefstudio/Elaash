import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AdminPanel from './AdminPanel'
import CustomerAuth from './CustomerAuth'
import CustomerPortal from './CustomerPortal'
import BookingPage from './BookingPage'
import './index.css'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Elaash service worker registration failed:', error)
    })
  })
}

const path = window.location.pathname.replace(/\/$/, '') || '/'
const isAdmin = path === '/admin' || new URLSearchParams(window.location.search).get('admin') === '1' || window.location.hash === '#admin'
const isCustomerAuth = path === '/login' || path === '/signin' || path === '/signup'
const isCustomerAccount = path === '/account' || path === '/my-elaash'
const isBookingPage = path === '/book' || path === '/booking'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdmin ? <AdminPanel /> : isCustomerAuth ? <CustomerAuth /> : isCustomerAccount ? <CustomerPortal /> : isBookingPage ? <BookingPage /> : <App />}
  </React.StrictMode>,
)
