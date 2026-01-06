import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { UserRole } from '../contexts/RoleContext'
import { useToast } from '../contexts/ToastContext'
import { register } from '../services/authService'

function Register() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [allAccounts, setAllAccounts] = useState<string[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [connectingWallet, setConnectingWallet] = useState(false)
  const [loading, setLoading] = useState(false)

  const validateAddress = (address: string): boolean => {
    try {
      return ethers.isAddress(address)
    } catch {
      return false
    }
  }

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      showToast('Please install MetaMask wallet first!', 'error')
      return
    }

    setConnectingWallet(true)

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      if (accounts && accounts.length > 0) {
        setAllAccounts(accounts)
        setSelectedAccount(accounts[0])
        setWalletAddress(accounts[0])
        showToast('Wallet connected successfully!', 'success')
      } else {
        showToast('No account selected. Please select an account in MetaMask.', 'error')
      }
    } catch (error: any) {
      if (error.code === 4001) {
        showToast('Please approve account access in MetaMask to continue.', 'error')
      } else {
        showToast('Failed to connect wallet. Please try again.', 'error')
      }
    } finally {
      setConnectingWallet(false)
    }
  }

  const handleSelectAccount = (account: string) => {
    setSelectedAccount(account)
    setWalletAddress(account)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) {
      showToast('Please select a role', 'error')
      return
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }

    if (!walletAddress || !selectedAccount) {
      showToast('Please connect and select a wallet address first', 'error')
      return
    }

    if (!validateAddress(walletAddress)) {
      showToast('Invalid wallet address', 'error')
      return
    }

    setLoading(true)

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner(selectedAccount)
      const timestamp = Date.now()
      const message = `Logistics Escrow Registration\n\nUsername: ${username}\nEmail: ${email}\nRole: ${selectedRole}\nAddress: ${walletAddress}\nTimestamp: ${timestamp}`
      const signature = await signer.signMessage(message)

      await register({
        username,
        email,
        password,
        role: selectedRole,
        walletAddress,
        signature,
        timestamp
      })

      showToast('Account created successfully!', 'success')
      navigate('/login')
    } catch (error: any) {
      showToast(error.message || 'Registration failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Create Account</h1>
        <p className="text-gray-600 mb-6">Choose your role and create your account</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
              placeholder="Enter your email"
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
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
              placeholder="Enter your password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
              placeholder="Confirm your password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[UserRole.SHIPPER, UserRole.LOGISTICS].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`p-4 border-2 rounded-lg transition text-center ${
                      selectedRole === role
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {role === UserRole.SHIPPER && '🚢'}
                      {role === UserRole.LOGISTICS && '🚚'}
                    </div>
                    <div className="text-sm font-semibold capitalize text-gray-800">{role}</div>
                  </button>
              ))}
            </div>
            </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Wallet Address
            </label>
            {allAccounts.length === 0 ? (
              <button
                type="button"
                onClick={handleConnectWallet}
                disabled={connectingWallet}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition"
              >
                {connectingWallet ? 'Connecting...' : 'Connect MetaMask Wallet'}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                  {allAccounts.map((account) => (
                    <button
                      key={account}
                      type="button"
                      onClick={() => handleSelectAccount(account)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition mb-1 ${
                        selectedAccount === account
                          ? 'bg-primary-100 text-primary-800 font-semibold'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{account}</span>
                        {selectedAccount === account && (
                          <span className="text-xs bg-primary-200 text-primary-800 px-2 py-0.5 rounded">Selected</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedAccount && (
                  <div className="w-full px-4 py-2 border-2 border-green-300 rounded-lg bg-green-50">
                    <p className="text-green-800 text-xs font-semibold mb-1">Selected Wallet:</p>
                    <p className="text-green-800 text-sm font-mono">{selectedAccount}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Refresh Accounts
                </button>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">Connect your MetaMask wallet and select an account to register</p>
          </div>

          <button
            type="submit"
            disabled={!selectedRole || !username || !email || !password || !confirmPassword || !walletAddress || loading}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  )
}

export default Register

