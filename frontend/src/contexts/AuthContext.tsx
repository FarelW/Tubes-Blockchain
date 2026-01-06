import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
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
    const token = localStorage.getItem('authToken')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      import('../services/authService').then(({ verifyToken }) => {
        verifyToken(token)
          .then(async (result) => {
            if (result.success && result.user) {
              setAuthenticatedAccount(result.user.walletAddress || null)
              setAuthenticatedRole(result.user.role as UserRole)
              setIsAuthenticated(true)
              localStorage.setItem('selectedRole', result.user.role)
            } else {
              localStorage.removeItem('authToken')
              localStorage.removeItem('user')
              localStorage.removeItem('selectedRole')
            }
          })
          .catch(() => {
            localStorage.removeItem('authToken')
            localStorage.removeItem('user')
            localStorage.removeItem('selectedRole')
          })
      })
    }
  }, [])

  const verifyWallet = (_address: string, _role: UserRole): boolean => {
    return true
  }

  const login = async (_role: UserRole): Promise<boolean> => {
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

