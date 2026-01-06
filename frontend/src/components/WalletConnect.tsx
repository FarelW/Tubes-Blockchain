import { useState, useEffect } from 'react'
import { useRole } from '../contexts/RoleContext'
import { useToast } from '../contexts/ToastContext'
import { getAccount, connectWallet as connectWalletService } from '../services/web3Service'
import BalanceDisplay from './BalanceDisplay'

function WalletConnect() {
  const { showToast } = useToast()
  const [account, setAccount] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false)
  const [allAccounts, setAllAccounts] = useState<string[]>([])

  useEffect(() => {
    checkWalletConnection()
    loadAllAccounts()
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', () => window.location.reload())
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])


  const checkWalletConnection = async () => {
    const acc = await getAccount()
    if (acc) {
      setAccount(acc)
    }
  }

  const loadAllAccounts = async () => {
    if (!window.ethereum) return
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      setAllAccounts(accounts || [])
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null)
      setAllAccounts([])
    } else {
      setAccount(accounts[0])
      setAllAccounts(accounts)
    }
  }

  const switchAccount = async (targetAccount: string) => {
    if (!window.ethereum) return
    
    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      })
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      if (accounts.includes(targetAccount)) {
        setAccount(targetAccount)
        setShowAccountSwitcher(false)
        window.location.reload() // Reload to update everything
      } else {
        showToast('Please select the account in MetaMask popup', 'error')
      }
    } catch (error: any) {
      if (error.code === 4001) {
        showToast('Please approve account access in MetaMask', 'error')
      } else {
        console.error('Error switching account:', error)
        showToast('Failed to switch account. Please select it manually in MetaMask.', 'error')
      }
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      showToast('Please install MetaMask to use this application!', 'error')
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    setIsConnecting(true)
    try {
      const address = await connectWalletService()
      setAccount(address)
      showToast('Wallet connected successfully!', 'success')
    } catch (error) {
      console.error('Error connecting wallet:', error)
      showToast('Failed to connect wallet. Please try again.', 'error')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (account) {
    return (
      <div className="flex items-center gap-2 relative">
        <BalanceDisplay />
        <div className="relative">
          <button
            onClick={() => setShowAccountSwitcher(!showAccountSwitcher)}
            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-mono text-sm transition flex items-center gap-2"
          >
            {formatAddress(account)}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showAccountSwitcher && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              <div className="p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">All Accounts</p>
                {allAccounts.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {allAccounts.map((acc) => (
                      <button
                        key={acc}
                        onClick={() => switchAccount(acc)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                          acc.toLowerCase() === account.toLowerCase()
                            ? 'bg-primary-100 text-primary-800 font-semibold'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs">{formatAddress(acc)}</span>
                          {acc.toLowerCase() === account.toLowerCase() && (
                            <span className="text-xs">Current</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 px-2 py-2">No accounts found</p>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={disconnectWallet}
          className="bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg text-sm font-medium transition"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg text-sm font-medium transition"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, handler: (...args: any[]) => void) => void
      removeListener: (event: string, handler: (...args: any[]) => void) => void
      send: (method: string, params?: any[]) => Promise<any>
    }
  }
}

export default WalletConnect
