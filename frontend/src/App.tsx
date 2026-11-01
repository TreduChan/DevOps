import { useState } from 'react'
import AdminView from './views/AdminView'
import BookingView from './views/BookingView'
import HomeView from './views/HomeView'
import UserView from './views/UserView'

function App() {
  const [currentView, setCurrentView] = useState('home')

  return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation or header */}
        <nav className="p-4 bg-white shadow flex gap-4">
          <button onClick={() => setCurrentView('home')}>Home</button>
          <button onClick={() => setCurrentView('booking')}>Book a room</button>
          <button onClick={() => setCurrentView('user')}>User</button>
          <button onClick={() => setCurrentView('admin')}>Admin</button>
        </nav>

        {/* Dynamic View Rendering */}
        <main className="p-6">
          {currentView === 'home' && <HomeView />}
          {currentView === 'booking' && <BookingView />}
          {currentView === 'user' && <UserView />}
          {currentView === 'admin' && <AdminView />}
        </main>
      </div>
  )
}

export default App