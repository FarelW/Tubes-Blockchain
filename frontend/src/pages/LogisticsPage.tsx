import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getUserEscrows, getEscrow, setPriceAndApprove, rejectPrice, startDelivery, markDelivered } from '../services/contractService'
import { EscrowStatus, getStatusLabel, getStatusColor } from '../utils/constants'

interface Escrow {
  id: string
  buyer: string
  seller: string
  amount: string
  status: EscrowStatus
  statusLabel: string
  createdAt: string
  destinationGPS: string
}

function LogisticsPage() {
  const { authenticatedAccount } = useAuth()
  const { showToast } = useToast()
  const [escrows, setEscrows] = useState<Escrow[]>([])
  const [loading, setLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletLoading, setWalletLoading] = useState(true)
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null)
  const [priceAmount, setPriceAmount] = useState('')
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  useEffect(() => {
    loadWalletAddress()
  }, [])

  useEffect(() => {
    if (walletAddress && authenticatedAccount) {
      loadEscrows()
    } else if (!walletLoading) {
      setLoading(false)
    }
  }, [walletAddress, authenticatedAccount, walletLoading])

  const loadWalletAddress = async () => {
    setWalletLoading(true)
    try {
      // Get wallet address from authenticated account or localStorage
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        setWalletAddress(user.walletAddress || null)
      } else if (authenticatedAccount) {
        setWalletAddress(authenticatedAccount)
      }
    } catch (error) {
      console.error('Error loading wallet:', error)
    } finally {
      setWalletLoading(false)
    }
  }

  const loadEscrows = async (showLoading = true) => {
    if (!authenticatedAccount || !walletAddress) {
      if (showLoading) {
        setLoading(false)
      }
      return
    }

    if (showLoading) {
      setLoading(true)
    }
    try {
      const escrowIds = await getUserEscrows(walletAddress)
      
      if (escrowIds.length === 0) {
        setEscrows([])
        if (showLoading) {
          setLoading(false)
        }
        return
      }

      const escrowPromises = escrowIds.map(async (id) => {
        const escrowData = await getEscrow(id.toString())
        // Only show escrows where seller (logistics) matches authenticated wallet
        if (!escrowData || escrowData.seller.toLowerCase() !== walletAddress.toLowerCase()) return null

        return {
          id: id.toString(),
          buyer: escrowData.buyer,
          seller: escrowData.seller,
          amount: ethers.formatEther(escrowData.amount),
          status: escrowData.status,
          statusLabel: getStatusLabel(escrowData.status),
          createdAt: new Date(Number(escrowData.createdAt) * 1000).toISOString(),
          destinationGPS: escrowData.destinationGPS
        }
      })

      const escrowsData = await Promise.all(escrowPromises)
      const validEscrows = escrowsData.filter((e): e is Escrow => e !== null)
      setEscrows(validEscrows)
    } catch (error) {
      console.error('Error loading escrows:', error)
      setEscrows([])
    } finally {
      setLoading(false)
    }
  }

  const handleSetPriceAndApprove = async () => {
    if (!selectedEscrow) return

    // Validate price
    const amount = parseFloat(priceAmount)
    if (isNaN(amount) || amount <= 0) {
      showToast('Price must be greater than 0', 'error')
      return
    }

    try {
      // Verify wallet connection and match with escrow seller
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed')
      }

      // Request account access to ensure we have the latest selected account
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const connectedAddress = await signer.getAddress()

      // Get escrow data to verify seller address
      const escrowData = await getEscrow(selectedEscrow.id)
      if (!escrowData) {
        throw new Error('Escrow not found')
      }

      // Check if connected wallet matches registered wallet first
      if (walletAddress && connectedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(`You are connected with wallet ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}, but your registered logistics wallet is ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}. Please switch to your logistics account (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}) in MetaMask.`)
      }

      // Check if connected wallet matches seller address in escrow
      if (connectedAddress.toLowerCase() !== escrowData.seller.toLowerCase()) {
        throw new Error(`Connected wallet (${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}) does not match seller address in escrow (${escrowData.seller.slice(0, 6)}...${escrowData.seller.slice(-4)}). Please switch to account ${escrowData.seller.slice(0, 6)}...${escrowData.seller.slice(-4)} in MetaMask.`)
      }

      setApproving(true)
      await setPriceAndApprove(selectedEscrow.id, priceAmount)
      showToast(`Price set to ${priceAmount} ETH and escrow approved! Shipper can now pay.`, 'success')
      setSelectedEscrow(null)
      setPriceAmount('')
      await loadEscrows(false) // Don't show loading spinner on refresh
    } catch (error: any) {
      showToast(error.message || 'Error setting price and approving', 'error')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async (escrowId: string) => {
    try {
      // Verify wallet connection and match with escrow seller
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed')
      }

      // Request account access to ensure we have the latest selected account
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const connectedAddress = await signer.getAddress()

      // Get escrow data to verify seller address
      const escrowData = await getEscrow(escrowId)
      if (!escrowData) {
        throw new Error('Escrow not found')
      }

      // Check if connected wallet matches registered wallet first
      if (walletAddress && connectedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(`You are connected with wallet ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}, but your registered logistics wallet is ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}. Please switch to your logistics account (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}) in MetaMask.`)
      }

      // Check if connected wallet matches seller address in escrow
      if (connectedAddress.toLowerCase() !== escrowData.seller.toLowerCase()) {
        throw new Error(`Connected wallet (${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}) does not match seller address in escrow (${escrowData.seller.slice(0, 6)}...${escrowData.seller.slice(-4)}). Please switch to account ${escrowData.seller.slice(0, 6)}...${escrowData.seller.slice(-4)} in MetaMask.`)
      }

      setRejecting(true)
      await rejectPrice(escrowId)
      showToast('Escrow request rejected.', 'success')
      await loadEscrows(false) // Don't show loading spinner on refresh
    } catch (error: any) {
      showToast(error.message || 'Error rejecting escrow', 'error')
    } finally {
      setRejecting(false)
    }
  }

  const handleStartDelivery = async (escrowId: string) => {
    try {
      // Verify wallet connection and match with escrow seller
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed')
      }

      // Request account access to ensure we have the latest selected account
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const connectedAddress = await signer.getAddress()

      // Get escrow data to verify seller address
      const escrowData = await getEscrow(escrowId)
      if (!escrowData) {
        throw new Error('Escrow not found')
      }

      // Check if connected wallet matches registered wallet first
      if (walletAddress && connectedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(`You are connected with wallet ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}, but your registered logistics wallet is ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}. Please switch to your logistics account (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}) in MetaMask.`)
      }

      // Check if connected wallet matches seller address in escrow
      if (connectedAddress.toLowerCase() !== escrowData.seller.toLowerCase()) {
        throw new Error(`Connected wallet (${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}) does not match seller address in escrow (${escrowData.seller.slice(0, 6)}...${escrowData.seller.slice(-4)}). Please switch to account ${escrowData.seller.slice(0, 6)}...${escrowData.seller.slice(-4)} in MetaMask.`)
      }

      await startDelivery(escrowId)
      showToast('Delivery started! Status updated to Delivering.', 'success')
      await loadEscrows(false) // Don't show loading spinner on refresh
    } catch (error: any) {
      showToast(error.message || 'Error updating status', 'error')
    }
  }

  const handleMarkDelivered = async (escrowId: string) => {
    try {
      // Verify wallet connection and match with escrow seller
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed')
      }

      // Request account access to ensure we have the latest selected account
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const connectedAddress = await signer.getAddress()

      // Get escrow data to verify seller address
      const escrowData = await getEscrow(escrowId)
      if (!escrowData) {
        throw new Error('Escrow not found')
      }

      // Check if connected wallet matches registered wallet first
      if (walletAddress && connectedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(`You are connected with wallet ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}, but your registered logistics wallet is ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}. Please switch to your logistics account (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}) in MetaMask.`)
      }

      // Check if connected wallet matches seller address in escrow
      if (connectedAddress.toLowerCase() !== escrowData.seller.toLowerCase()) {
        throw new Error(`Connected wallet (${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}) does not match seller address in escrow (${escrowData.seller.slice(0, 6)}...${escrowData.seller.slice(-4)}). Please switch to account ${escrowData.seller.slice(0, 6)}...${escrowData.seller.slice(-4)} in MetaMask.`)
      }

      await markDelivered(escrowId)
      showToast('Marked as delivered! Admin will verify and complete the order.', 'success')
      await loadEscrows(false) // Don't show loading spinner on refresh
    } catch (error: any) {
      showToast(error.message || 'Error marking as delivered', 'error')
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading || walletLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Logistics Dashboard</h1>
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-gray-500">Loading orders...</div>
        </div>
      </div>
    )
  }

  if (!walletAddress) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Logistics Dashboard</h1>
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-red-600 mb-4 font-semibold">Wallet Not Connected</div>
          <p className="text-gray-600 mb-6">
            Please connect your wallet in the Account page to view orders.
          </p>
          <Link
            to="/account"
            className="inline-block bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition"
          >
            Go to Account Page
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Logistics Dashboard</h1>

      {escrows.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-gray-500">No orders found</div>
        </div>
      ) : (
        <div className="space-y-4">
          {escrows.map((escrow) => (
            <div
              key={escrow.id}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(escrow.status)}`}
                    >
                      {escrow.statusLabel}
                    </span>
                    <span className="text-gray-500 text-sm">
                      Order #{escrow.id}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Amount</p>
                      <p className="font-semibold text-gray-800">{escrow.amount} ETH</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Shipper</p>
                      <p className="font-mono font-semibold text-gray-800">{formatAddress(escrow.buyer)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Destination</p>
                      <p className="font-semibold text-gray-800">{escrow.destinationGPS}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Created</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(escrow.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  {escrow.status === EscrowStatus.Created && (
                    <>
                      <button
                        onClick={() => setSelectedEscrow(escrow)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        Set Price & Approve
                      </button>
                      <button
                        onClick={() => handleReject(escrow.id)}
                        disabled={rejecting}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rejecting ? 'Rejecting...' : 'Reject'}
                      </button>
                    </>
                  )}
                  {escrow.status === EscrowStatus.Funded && (
                    <button
                      onClick={() => handleStartDelivery(escrow.id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      Start Delivery
                    </button>
                  )}
                  {escrow.status === EscrowStatus.InTransit && (
                    <button
                      onClick={() => handleMarkDelivered(escrow.id)}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      Mark Delivered
                    </button>
                  )}
                  <Link
                    to={`/tracking/${escrow.id}`}
                    className="text-primary-600 hover:text-primary-700 font-semibold text-sm text-center"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for setting price and approving */}
      {selectedEscrow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setSelectedEscrow(null)
          setPriceAmount('')
        }}>
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Set Price & Approve</h2>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Order ID</p>
                <p className="font-mono font-semibold">{selectedEscrow.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Shipper</p>
                <p className="font-mono font-semibold">{formatAddress(selectedEscrow.buyer)}</p>
              </div>
              <div>
                <label htmlFor="priceAmount" className="block text-sm font-semibold text-gray-700 mb-2">
                  Set Price (ETH) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="priceAmount"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  placeholder="1.0"
                  step="0.001"
                  min="0.001"
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
                />
                <p className="mt-1 text-sm text-gray-600">
                  This is the price the shipper will pay for this delivery.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSetPriceAndApprove}
                disabled={approving || !priceAmount || parseFloat(priceAmount) <= 0}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approving ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => {
                  setSelectedEscrow(null)
                  setPriceAmount('')
                }}
                disabled={approving}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LogisticsPage

