import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { authenticatedRole, authenticatedAccount, logout } = useAuth()
  const [balance, setBalance] = useState<string | null>(null)

  useEffect(() => {
    if (authenticatedAccount && window.ethereum) {
      loadBalance(authenticatedAccount)

      const handleAccountsChanged = () => {
        if (authenticatedAccount) {
          loadBalance(authenticatedAccount)
        }
      }

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged)

        return () => {
          if (window.ethereum) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
          }
        }
      }
    } else {
      setBalance(null)
    }
  }, [authenticatedAccount])

  const loadBalance = async (address: string) => {
    if (!window.ethereum) {
      setBalance(null)
      return
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const balanceWei = await provider.getBalance(address)
      const balanceEth = ethers.formatEther(balanceWei)
      setBalance(parseFloat(balanceEth).toFixed(4))
    } catch (error) {
      console.error('Error loading balance:', error)
      setBalance(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg">
        <div className="container mx-auto px-1 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold hover:opacity-90 transition">
              🚚 Logistics Escrow
            </Link>
            <nav className="flex items-center gap-6">
              {authenticatedRole && (
                <>
                  <Link to="/dashboard" className="hover:opacity-80 transition font-medium">
                    Order
                  </Link>
                  <Link to="/account" className="hover:opacity-80 transition font-medium">
                    Account
                  </Link>
                </>
              )}
              {authenticatedRole && authenticatedAccount && balance !== null && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/20">
                  <span>Balance: {balance} ETH</span>
                </div>
              )}
              {authenticatedRole && (
                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg text-sm font-medium transition"
                >
                  Logout
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {authenticatedRole && children}
      </main>
    </div>
  )
}

export default Layout
