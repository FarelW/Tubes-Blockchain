import express from 'express'
import { ethers } from 'ethers'
import { User } from '../models/User.js'
import { Session } from '../models/Session.js'

const router = express.Router()

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, walletAddress, signature } = req.body

    if (!username || !email || !password || !role || !walletAddress || !signature) {
      return res.status(400).json({ error: 'Username, email, password, role, wallet address, and signature are required' })
    }

    if (!['shipper', 'logistics'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be shipper or logistics. Admin cannot be created through registration.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' })
    }

    // Normalize wallet address to lowercase for consistent storage and comparison
    const normalizedWalletAddress = walletAddress.toLowerCase()

    // Verify signature
    const message = `Logistics Escrow Registration\n\nUsername: ${username}\nEmail: ${email}\nRole: ${role}\nAddress: ${walletAddress}\nTimestamp: ${req.body.timestamp || Date.now()}`
    let recoveredAddress
    try {
      recoveredAddress = ethers.verifyMessage(message, signature)
    } catch (sigError) {
      return res.status(400).json({ error: 'Invalid signature format' })
    }

    if (recoveredAddress.toLowerCase() !== normalizedWalletAddress) {
      return res.status(400).json({ error: 'Signature verification failed. Wallet address does not match signature.' })
    }

    // Check if wallet address is already used (case-insensitive)
    const existingWalletUser = await User.findByWalletAddress(normalizedWalletAddress)
    if (existingWalletUser) {
      return res.status(400).json({
        error: 'This wallet address is already registered to another account',
        existingUsername: existingWalletUser.username
      })
    }

    const existingUser = await User.findByUsername(username) || await User.findByEmail(email)
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' })
    }

    const user = await User.create({
      username,
      email,
      password,
      role,
      walletAddress: normalizedWalletAddress
    })

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.wallet_address
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'This wallet address is already registered to another account' })
    }
    res.status(500).json({ error: 'Failed to register user' })
  }
})

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    const user = await User.findByUsername(username)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const passwordValid = await User.verifyPassword(user, password)
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid password' })
    }

    const walletAddress = user.wallet_address || ''

    const session = await Session.create({
      userId: user.id,
      walletAddress,
      expiresInHours: 24
    })

    res.json({
      success: true,
      token: session.token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.wallet_address || null
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
})

/**
 * Verify session token
 * GET /api/auth/verify
 */
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const session = await Session.findByToken(token)
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const user = await User.findById(session.user_id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.wallet_address || null
      }
    })
  } catch (error) {
    console.error('Verify error:', error)
    res.status(500).json({ error: 'Failed to verify token' })
  }
})

/**
 * Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (token) {
      await Session.delete(token)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Failed to logout' })
  }
})

/**
 * Get all users (admin only)
 * GET /api/auth/users
 */
/**
 * Get wallet address
 * GET /api/auth/wallet
 */
router.get('/wallet', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const session = await Session.findByToken(token)
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const user = await User.findById(session.user_id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      success: true,
      walletAddress: user.wallet_address || null
    })
  } catch (error) {
    console.error('Get wallet error:', error)
    res.status(500).json({ error: 'Failed to get wallet address' })
  }
})

/**
 * Update wallet address
 * PUT /api/auth/wallet
 */
router.put('/wallet', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const session = await Session.findByToken(token)
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const { walletAddress, signature } = req.body

    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'Wallet address and signature are required' })
    }

    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' })
    }

    // Normalize wallet address to lowercase for consistent storage and comparison
    const normalizedWalletAddress = walletAddress.toLowerCase()

    const user = await User.findById(session.user_id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if wallet address is already used by another user (case-insensitive)
    const existingUser = await User.findByWalletAddress(normalizedWalletAddress)
    if (existingUser && existingUser.id !== user.id) {
      return res.status(400).json({
        error: 'This wallet address is already registered to another account',
        existingUsername: existingUser.username
      })
    }

    // If user already has this wallet address, no need to update
    if (user.wallet_address && user.wallet_address.toLowerCase() === normalizedWalletAddress) {
      return res.json({
        success: true,
        message: 'Wallet address is already registered to this account',
        walletAddress: user.wallet_address
      })
    }

    // Verify signature
    const message = `Logistics Escrow Wallet Update\n\nUsername: ${user.username}\nAddress: ${walletAddress}\nTimestamp: ${req.body.timestamp || Date.now()}`
    let recoveredAddress
    try {
      recoveredAddress = ethers.verifyMessage(message, signature)
    } catch (sigError) {
      return res.status(400).json({ error: 'Invalid signature format' })
    }

    if (recoveredAddress.toLowerCase() !== normalizedWalletAddress) {
      return res.status(400).json({ error: 'Signature verification failed. Wallet address does not match signature.' })
    }

    const updatedUser = await User.update(user.id, {
      username: user.username,
      email: user.email,
      role: user.role,
      walletAddress: normalizedWalletAddress
    })

    // Create new session with updated wallet address
    const newSession = await Session.create({
      userId: user.id,
      walletAddress: walletAddress,
      expiresInHours: 24
    })

    res.json({
      success: true,
      message: 'Wallet address updated successfully',
      token: newSession.token,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        walletAddress: updatedUser.wallet_address || null
      }
    })
  } catch (error) {
    console.error('Update wallet error:', error)
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'This wallet address is already registered to another account' })
    }
    res.status(500).json({ error: 'Failed to update wallet address' })
  }
})

router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll()
    res.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        walletAddress: u.wallet_address,
        createdAt: u.created_at
      }))
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Failed to get users' })
  }
})

/**
 * Get logistics users with validated wallet
 * GET /api/auth/logistics
 */
router.get('/logistics', async (req, res) => {
  try {
    const logisticsUsers = await User.findByRole('logistics')
    const validatedLogistics = logisticsUsers.filter(user => user.wallet_address && user.wallet_address.trim() !== '')

    res.json({
      success: true,
      logistics: validatedLogistics.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        walletAddress: u.wallet_address
      }))
    })
  } catch (error) {
    console.error('Get logistics error:', error)
    res.status(500).json({ error: 'Failed to get logistics users' })
  }
})

export default router

