import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { getUserEscrows, getEscrow, fundEscrow } from '../services/contractService'
import { getWallet } from '../services/authService'
import { useToast } from '../contexts/ToastContext'
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
  minTemperature: string
  maxTemperature: string
  deadline: string
}

function ShipperPage() {
  const { showToast } = useToast()
  const [escrows, setEscrows] = useState<Escrow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [funding, setFunding] = useState(false)

  useEffect(() => {
    loadWalletAddress()
  }, [])

  useEffect(() => {
    if (walletAddress) {
      loadEscrows()
    }
  }, [walletAddress])

  const loadWalletAddress = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        const result = await getWallet(token)
        setWalletAddress(result.walletAddress || null)
      }
    } catch (error) {
      console.error('Error loading wallet:', error)
    }
  }

  const loadEscrows = async (showLoading = true) => {
    if (!walletAddress) {
      setLoading(false)
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
        if (!escrowData || escrowData.buyer.toLowerCase() !== walletAddress.toLowerCase()) return null

        return {
          id: id.toString(),
          buyer: escrowData.buyer,
          seller: escrowData.seller,
          amount: escrowData.amount > 0 ? ethers.formatEther(escrowData.amount) : '0',
          status: escrowData.status,
          statusLabel: getStatusLabel(escrowData.status),
          createdAt: new Date(Number(escrowData.createdAt) * 1000).toISOString(),
          destinationGPS: escrowData.destinationGPS,
          minTemperature: (Number(escrowData.minTemperature) / 100).toFixed(2),
          maxTemperature: (Number(escrowData.maxTemperature) / 100).toFixed(2),
          deadline: new Date(Number(escrowData.deadline) * 1000).toISOString()
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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const handleFundEscrow = async (escrowId: string, amount: string) => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const connectedAddress = await signer.getAddress()

      if (walletAddress && connectedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(`Connected wallet (${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}) does not match your registered shipper wallet (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}). Please switch to your registered account in MetaMask.`)
      }

      setFunding(true)
      await fundEscrow(escrowId, amount)
      showToast(`Payment of ${amount} ETH successful! Order is now funded.`, 'success')
      setSelectedEscrow(null)
      await loadEscrows(false) // Don't show loading spinner on refresh
    } catch (error: any) {
      showToast(error.message || 'Error funding escrow', 'error')
    } finally {
      setFunding(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Shipper Dashboard</h1>
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-gray-500">Loading orders...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Orders</h1>
        <Link
          to="/create"
          className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition"
        >
          Create New Escrow
        </Link>
      </div>

      {escrows.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-gray-500 mb-4">No orders found</div>
          <Link
            to="/create"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Create your first order
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {escrows.map((escrow) => (
            <div
              key={escrow.id}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
              onClick={() => setSelectedEscrow(escrow)}
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
                      <p className="text-gray-500 mb-1">Logistics</p>
                      <p className="font-mono font-semibold text-gray-800">{formatAddress(escrow.seller)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Destination</p>
                      <p className="font-semibold text-gray-800">{escrow.destinationGPS}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Deadline</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(escrow.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  {escrow.status === EscrowStatus.PriceProposed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEscrow(escrow)
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      Pay {escrow.amount} ETH
                    </button>
                  )}
                  {escrow.status === EscrowStatus.PriceRejected && (
                    <span className="text-red-600 text-sm font-semibold">Rejected</span>
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

      {selectedEscrow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Order Details</h2>
              <button
                onClick={() => setSelectedEscrow(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-semibold text-gray-800">#{selectedEscrow.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedEscrow.status)}`}
                >
                  {selectedEscrow.statusLabel}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-semibold text-gray-800">{selectedEscrow.amount} ETH</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Logistics</p>
                <p className="font-mono font-semibold">{selectedEscrow.seller}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Destination GPS</p>
                <p className="font-semibold text-gray-800">{selectedEscrow.destinationGPS}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Temperature Range</p>
                <p className="font-semibold text-gray-800">
                  {selectedEscrow.minTemperature}°C - {selectedEscrow.maxTemperature}°C
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Deadline</p>
                <p className="font-semibold text-gray-800">
                  {new Date(selectedEscrow.deadline).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              {selectedEscrow.status === EscrowStatus.PriceProposed && (
                <button
                  onClick={() => handleFundEscrow(selectedEscrow.id, selectedEscrow.amount)}
                  disabled={funding}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {funding ? 'Processing Payment...' : `Pay ${selectedEscrow.amount} ETH`}
                </button>
              )}
              <Link
                to={`/tracking/${selectedEscrow.id}`}
                className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition text-center"
              >
                Track Delivery
              </Link>
              <button
                onClick={() => setSelectedEscrow(null)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:border-gray-400 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShipperPage

