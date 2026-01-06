import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { getAccount } from '../services/web3Service'

function BalanceDisplay() {
  const [balance, setBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<string | null>(null)

  useEffect(() => {
    checkBalance()
    
    if (window.ethereum) {
      const handleAccountsChanged = () => {
        checkBalance()
      }
      
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
  }, [])

  const checkBalance = async () => {
    if (!window.ethereum) {
      setLoading(false)
      return
    }

    try {
      const acc = await getAccount()
      setAccount(acc)
      
      if (acc) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const balanceWei = await provider.getBalance(acc)
        const balanceEth = ethers.formatEther(balanceWei)
        setBalance(parseFloat(balanceEth).toFixed(4))
      }
    } catch (error) {
      console.error('Error checking balance:', error)
      setBalance(null)
    } finally {
      setLoading(false)
    }
  }

  if (!account || loading) {
    return null
  }


  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/20 text-white">
      <span>Balance: {balance || '0.0000'} ETH</span>
    </div>
  )
}

export default BalanceDisplay

