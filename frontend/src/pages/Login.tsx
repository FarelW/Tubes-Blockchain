import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { login as loginAPI } from '../services/authService'

function Login() {
  const navigate = useNavigate()
  const { setAuthenticatedRole, setAuthenticatedAccount, setIsAuthenticated } = useAuth()
  const { showToast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !password) {
      showToast('Please enter your username and password', 'error')
      return
    }

    setIsLoggingIn(true)

    try {
      const result = await loginAPI({
        username,
        password
      })

      if (result.success && result.token && result.user) {
        localStorage.setItem('authToken', result.token)
        localStorage.setItem('user', JSON.stringify(result.user))
        localStorage.setItem('selectedRole', result.user.role)

        setAuthenticatedAccount(result.user.walletAddress || null)
        setAuthenticatedRole(result.user.role as any)
        setIsAuthenticated(true)

        showToast('Login successful!', 'success')
        navigate('/dashboard')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      showToast(error.message || 'Login failed. Please try again.', 'error')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Login</h1>
        <p className="text-gray-600 mb-6">Enter your credentials to continue</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition disabled:bg-gray-100"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition disabled:bg-gray-100"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn || !username || !password}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Create Account
          </button>
        </p>
      </div>
    </div>
  )
}

export default Login
