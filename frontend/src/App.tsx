import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { UserRole } from './contexts/RoleContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import CreateEscrow from './pages/CreateEscrow'
import EscrowDashboard from './pages/EscrowDashboard'
import DeliveryTracking from './pages/DeliveryTracking'
import ShipperPage from './pages/ShipperPage'
import LogisticsPage from './pages/LogisticsPage'
import AdminPage from './pages/AdminPage'
import AccountPage from './pages/AccountPage'

function App() {
  const { isAuthenticated, authenticatedRole } = useAuth()

  const getDashboardRoute = () => {
    if (!isAuthenticated) return <Navigate to="/login" />
    
    switch (authenticatedRole) {
      case UserRole.SHIPPER:
        return <Layout><ShipperPage /></Layout>
      case UserRole.LOGISTICS:
        return <Layout><LogisticsPage /></Layout>
      case UserRole.ADMIN:
        return <Layout><AdminPage /></Layout>
      default:
        return <Navigate to="/login" />
    }
  }

  return (
    <Routes>
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route
        path="/"
        element={isAuthenticated ? <Layout><Home /></Layout> : <Navigate to="/login" />}
      />
      <Route
        path="/create"
        element={isAuthenticated ? <Layout><CreateEscrow /></Layout> : <Navigate to="/login" />}
      />
      <Route
        path="/dashboard"
        element={getDashboardRoute()}
      />
      <Route
        path="/tracking/:escrowId"
        element={isAuthenticated ? <Layout><DeliveryTracking /></Layout> : <Navigate to="/login" />}
      />
      <Route
        path="/account"
        element={isAuthenticated ? <Layout><AccountPage /></Layout> : <Navigate to="/login" />}
      />
    </Routes>
  )
}

export default App

