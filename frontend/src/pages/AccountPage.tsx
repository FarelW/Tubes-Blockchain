import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { switchToHardhatNetwork } from '../services/web3Service'
import { verifyToken, updateWallet, getWallet } from '../services/authService'

function AccountPage() {
  const location = useLocation()
  const { setAuthenticatedAccount, setAuthenticatedRole, setIsAuthenticated } = useAuth()
  const { showToast } = useToast()
  const [walletConnected, setWalletConnected] = useState(false)
  const [allAccounts, setAllAccounts] = useState<string[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)

  useEffect(() => {
    setWalletConnected(false)
    setSelectedAccount(null)
    setAllAccounts([])

    loadUserInfo()
  }, [location.pathname])

  useEffect(() => {
    if (window.ethereum && walletConnected) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', () => {
        window.location.reload()
      })

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
  }, [walletConnected])

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      if (!selectedAccount) {
        setSelectedAccount(accounts[0])
      }
    } else {
      setWalletConnected(false)
      setSelectedAccount(null)
    }
  }

  const loadBalance = async (address: string) => {
    try {
      if (!window.ethereum) return
      const provider = new ethers.BrowserProvider(window.ethereum)
      const balance = await provider.getBalance(address)
      setBalance(ethers.formatEther(balance))
    } catch (error) {
      console.error('Error loading balance:', error)
    }
  }

  const loadUserInfo = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        const userResult = await verifyToken(token)
        if (userResult.success && userResult.user) {
          const walletResult = await getWallet(token)
          setUserInfo({
            ...userResult.user,
            walletAddress: walletResult.walletAddress || null
          })
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      showToast('Please install MetaMask', 'error')
      return
    }

    setConnecting(true)

    try {
      await switchToHardhatNetwork()
      await new Promise(resolve => setTimeout(resolve, 1000))

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })

      if (accounts && accounts.length > 0) {
        setWalletConnected(true)
        setAllAccounts(accounts)
        setSelectedAccount(accounts[0])
        loadBalance(accounts[0])
        showToast('Wallet connected. Please select an account to save.', 'success')
      } else {
        showToast('No account selected. Please select an account in MetaMask.', 'error')
      }
    } catch (error: any) {
      if (error.code === 4001) {
        showToast('Connection cancelled. Please approve account access in MetaMask to connect.', 'error')
      } else {
        showToast(error.message || 'Failed to connect wallet', 'error')
      }
    } finally {
      setConnecting(false)
    }
  }

  const handleSaveWallet = async () => {
    if (!selectedAccount || !userInfo) {
      showToast('Please select a wallet address first', 'error')
      return
    }

    if (!window.ethereum) {
      showToast('Please install MetaMask', 'error')
      return
    }

    setSaving(true)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)

      const signer = await provider.getSigner(selectedAccount)

      const timestamp = Date.now()
      const message = `Logistics Escrow Wallet Update\n\nUsername: ${userInfo.username}\nAddress: ${selectedAccount}\nTimestamp: ${timestamp}`
      const signature = await signer.signMessage(message)

      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const result = await updateWallet({ walletAddress: selectedAccount, signature, timestamp }, token)

      if (result.token && result.user) {
        localStorage.setItem('authToken', result.token)
        localStorage.setItem('user', JSON.stringify(result.user))
        localStorage.setItem('selectedRole', result.user.role)

        setAuthenticatedAccount(result.user.walletAddress || null)
        setAuthenticatedRole(result.user.role as any)
        setIsAuthenticated(true)
      }

      showToast('Wallet address updated successfully! Credentials have been refreshed.', 'success')

      if (result.user) {
        setUserInfo(result.user)
      }
    } catch (error: any) {
      if (error.message && error.message.includes('already registered')) {
        showToast(error.message, 'error')
      } else {
        showToast(error.message || 'Failed to save wallet address', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Account</h1>
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-gray-500">Loading account information...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Account</h1>

      <div className="bg-white p-8 rounded-xl shadow-md mb-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Profile Information</h2>
        {userInfo && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Username</p>
              <p className="font-semibold text-gray-800">{userInfo.username}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Email</p>
              <p className="font-semibold text-gray-800">{userInfo.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Role</p>
              <p className="font-semibold text-gray-800 capitalize">{userInfo.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Registered Wallet Address</p>
              <p className="font-mono font-semibold text-gray-800">
                {userInfo.walletAddress || 'Not connected'}
              </p>
            </div>
            {userInfo.walletAddress && balance !== null && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Wallet Balance</p>
                <p className="font-semibold text-gray-800 text-lg">
                  {balance} ETH
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Wallet Connection</h2>

        {walletConnected && allAccounts.length > 0 ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Select Wallet Address to Save</p>
              <div className="space-y-2">
                {allAccounts.map((account) => (
                  <button
                    key={account}
                    onClick={() => {
                      setSelectedAccount(account)
                      loadBalance(account)
                    }}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${selectedAccount?.toLowerCase() === account.toLowerCase()
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-primary-300 bg-white'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono font-semibold text-gray-800">{account}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatAddress(account)}
                        </div>
                      </div>
                      {selectedAccount?.toLowerCase() === account.toLowerCase() && (
                        <span className="text-primary-600 font-bold">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedAccount && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-blue-800 text-sm">
                  Selected: <span className="font-mono">{formatAddress(selectedAccount)}</span>
                </p>
              </div>
            )}

            {selectedAccount && userInfo && userInfo.walletAddress && selectedAccount.toLowerCase() === userInfo.walletAddress.toLowerCase() && (
              <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <p className="text-green-800 text-sm">
                  ✓ This wallet is already registered to your account.
                </p>
              </div>
            )}

            {selectedAccount && (
              <button
                onClick={handleSaveWallet}
                disabled={saving || !selectedAccount}
                className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Saving...' : 'Save Wallet Address'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Connect your MetaMask wallet to link it to your account. You can connect and save your wallet address here.
            </p>
            <button
              onClick={handleConnectWallet}
              disabled={connecting}
              className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {connecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountPage

