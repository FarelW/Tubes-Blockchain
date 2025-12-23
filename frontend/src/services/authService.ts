const API_BASE_URL = 'http://localhost:3001/api/auth'

export interface RegisterData {
  username: string
  email: string
  password: string
  role: 'admin' | 'shipper' | 'logistics'
  walletAddress: string
  signature: string
  timestamp: number
}

export interface LoginData {
  username: string
  password: string
}

export interface UpdateWalletData {
  walletAddress: string
  signature: string
  timestamp?: number
}

export interface User {
  id: number
  username: string
  email: string
  role: string
  walletAddress?: string | null
}

export interface WalletResponse {
  success: boolean
  walletAddress?: string | null
  error?: string
}

export interface UpdateWalletResponse {
  success: boolean
  message?: string
  token?: string
  user?: User
  walletAddress?: string | null
  error?: string
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: User
  error?: string
}

/**
 * Register new user
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Registration failed')
    }

    return result
  } catch (error: any) {
    console.error('Register error:', error)
    throw error
  }
}

/**
 * Login user
 */
export const login = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Login failed')
    }

    return result
  } catch (error: any) {
    console.error('Login error:', error)
    throw error
  }
}

/**
 * Verify session token
 */
export const verifyToken = async (token: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Token verification failed')
    }

    return result
  } catch (error: any) {
    console.error('Verify error:', error)
    throw error
  }
}

/**
 * Logout user
 */
export const logout = async (token: string): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
  } catch (error) {
    console.error('Logout error:', error)
  }
}

/**
 * Get wallet address
 */
export const getWallet = async (token: string): Promise<WalletResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get wallet address')
    }

    return result
  } catch (error: any) {
    console.error('Get wallet error:', error)
    throw error
  }
}

/**
 * Get logistics users with validated wallet
 */
export const getLogistics = async (token: string): Promise<{ success: boolean; logistics?: Array<{ id: number; username: string; email: string; walletAddress: string }>; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/logistics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get logistics users')
    }

    return result
  } catch (error: any) {
    console.error('Get logistics error:', error)
    throw error
  }
}

/**
 * Update wallet address
 */
export const updateWallet = async (data: UpdateWalletData, token: string): Promise<UpdateWalletResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update wallet address')
    }

    return {
      success: result.success,
      message: result.message,
      token: result.token,
      user: result.user,
      walletAddress: result.walletAddress || result.user?.walletAddress
    }
  } catch (error: any) {
    console.error('Update wallet error:', error)
    throw error
  }
}

