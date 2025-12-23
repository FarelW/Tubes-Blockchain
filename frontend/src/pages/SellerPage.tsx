import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useAuth } from '../contexts/AuthContext'
import { getUserEscrows, getEscrow, startDelivery, markDelivered } from '../services/contractService'
import { EscrowStatus, getStatusLabel, getStatusColor } from '../utils/constants'
import { useToast } from '../contexts/ToastContext'

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

function SellerPage() {
  const { authenticatedAccount } = useAuth()
  const { showToast } = useToast()
  const [escrows, setEscrows] = useState<Escrow[]>([])
  const [loading, setLoading] = useState(true)

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
        if (!escrowData || escrowData.seller.toLowerCase() !== authenticatedAccount.toLowerCase()) return null

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

  const handleStartDelivery = async (escrowId: string) => {
    try {
      await startDelivery(escrowId)
      showToast('Delivery started successfully!', 'success')
      await loadEscrows()
    } catch (error: any) {
      showToast(error.message || 'Error starting delivery', 'error')
    }
  }

  const handleMarkDelivered = async (escrowId: string) => {
    try {
      await markDelivered(escrowId)
      showToast('Marked as delivered! Oracle will verify automatically.', 'success')
      await loadEscrows()
    } catch (error: any) {
      showToast(error.message || 'Error marking as delivered', 'error')
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Seller Dashboard</h1>
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-gray-500">Loading orders...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Seller Dashboard</h1>

      {escrows.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <p className="text-gray-600 mb-4 text-lg">No orders found</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {escrows.map((escrow) => (
            <div key={escrow.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
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
                  <p className="text-sm text-gray-500 mb-1">Buyer</p>
                  <p className="font-mono font-semibold text-gray-800">{formatAddress(escrow.buyer)}</p>
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
                  <p className="text-sm text-gray-500 mb-1">Destination GPS</p>
                  <p className="font-mono text-sm text-gray-800">{escrow.destinationGPS}</p>
                </div>
              </div>

              <div className="pt-4 border-t flex gap-2">
                {escrow.status === EscrowStatus.Funded && (
                  <button
                    onClick={() => handleStartDelivery(escrow.id)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    Start Delivery
                  </button>
                )}
                {escrow.status === EscrowStatus.InTransit && (
                  <button
                    onClick={() => handleMarkDelivered(escrow.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    Mark as Delivered
                  </button>
                )}
                <Link
                  to={`/tracking/${escrow.id}`}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  Track
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SellerPage

