import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { UserRole } from './RoleContext'

interface AuthContextType {
  isAuthenticated: boolean
  authenticatedAccount: string | null
  authenticatedRole: UserRole | null
  login: (role: UserRole) => Promise<boolean>
  logout: () => void
  verifyWallet: (address: string, role: UserRole) => boolean
  setAuthenticatedAccount: (account: string | null) => void
  setAuthenticatedRole: (role: UserRole | null) => void
  setIsAuthenticated: (isAuth: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticatedAccount, setAuthenticatedAccount] = useState<string | null>(null)
  const [authenticatedRole, setAuthenticatedRole] = useState<UserRole | null>(null)

  useEffect(() => {
    // Check if user was previously authenticated
    const token = localStorage.getItem('authToken')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      // Verify token with backend
      import('../services/authService').then(({ verifyToken }) => {
        verifyToken(token)
          .then(async (result) => {
            if (result.success && result.user) {
              // Get wallet address from user credentials
              setAuthenticatedAccount(result.user.walletAddress || null)
              setAuthenticatedRole(result.user.role as UserRole)
              setIsAuthenticated(true)
              localStorage.setItem('selectedRole', result.user.role)
            } else {
              // Token invalid, clear storage
              localStorage.removeItem('authToken')
              localStorage.removeItem('user')
              localStorage.removeItem('selectedRole')
            }
          })
          .catch(() => {
            // Token invalid, clear storage
            localStorage.removeItem('authToken')
            localStorage.removeItem('user')
            localStorage.removeItem('selectedRole')
          })
      })
    }
  }, [])

  const verifyWallet = (address: string, role: UserRole): boolean => {
    // No longer validating against hardcoded addresses
    // Wallet validation is now done via backend/registered wallet
    return true
  }

  const login = async (role: UserRole): Promise<boolean> => {
    // This function is no longer used for MetaMask-based login
    // Login is now handled via username/password in Login.tsx
    throw new Error('This login method is deprecated. Please use username/password login.')
  }

  const logout = async () => {
    const token = localStorage.getItem('authToken')
    if (token) {
      try {
        await import('../services/authService').then(({ logout: logoutAPI }) => {
          logoutAPI(token)
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    localStorage.removeItem('selectedRole')
    setAuthenticatedAccount(null)
    setAuthenticatedRole(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authenticatedAccount,
        authenticatedRole,
        login,
        logout,
        verifyWallet,
        setAuthenticatedAccount,
        setAuthenticatedRole,
        setIsAuthenticated
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

