import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'
import { getUserEscrows, getEscrow } from '../services/contractService'
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

function BuyerPage() {
  const { authenticatedAccount } = useAuth()
  const [escrows, setEscrows] = useState<Escrow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null)

  useEffect(() => {
    if (authenticatedAccount) {
      loadEscrows()
    }
  }, [authenticatedAccount])

  const loadEscrows = async () => {
    if (!authenticatedAccount) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const escrowIds = await getUserEscrows(authenticatedAccount)
      
      if (escrowIds.length === 0) {
        setEscrows([])
        setLoading(false)
        return
      }

      const escrowPromises = escrowIds.map(async (id) => {
        const escrowData = await getEscrow(id.toString())
        if (!escrowData) return null

        return {
          id: id.toString(),
          buyer: escrowData.buyer,
          seller: escrowData.seller,
          amount: ethers.formatEther(escrowData.amount),
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">My Orders</h1>
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-gray-500">Loading orders...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">My Orders</h1>

      {escrows.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <p className="text-gray-600 mb-4 text-lg">No orders found</p>
          <Link
            to="/create"
            className="inline-block bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition"
          >
            Create First Order
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {escrows.map((escrow) => (
            <div 
              key={escrow.id} 
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
              onClick={() => setSelectedEscrow(escrow)}
            >
              <div className="flex justify-between items-start mb-4 pb-4 border-b">
                <h3 className="text-xl font-bold font-mono text-gray-800">
                  Order #{escrow.id.slice(0, 8)}
                </h3>
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: getStatusColor(escrow.status) }}
                >
                  {escrow.statusLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Seller</p>
                  <p className="font-mono font-semibold text-gray-800">{formatAddress(escrow.seller)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Amount</p>
                  <p className="font-semibold text-gray-800">{escrow.amount} ETH</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Created</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(escrow.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Deadline</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(escrow.deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Link
                  to={`/tracking/${escrow.id}`}
                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  Track Delivery
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedEscrow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedEscrow(null)}>
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Order Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-mono font-semibold">{selectedEscrow.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Seller</p>
                <p className="font-mono font-semibold">{selectedEscrow.seller}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-semibold">{selectedEscrow.amount} ETH</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Destination GPS</p>
                <p className="font-mono">{selectedEscrow.destinationGPS}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Temperature Range</p>
                <p className="font-semibold">{selectedEscrow.minTemperature}°C - {selectedEscrow.maxTemperature}°C</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold text-white inline-block"
                  style={{ backgroundColor: getStatusColor(selectedEscrow.status) }}
                >
                  {selectedEscrow.statusLabel}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedEscrow(null)}
              className="mt-6 w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BuyerPage

