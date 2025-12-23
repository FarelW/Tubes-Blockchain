import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useToast } from '../contexts/ToastContext'
import { getEscrowCount, getEscrow } from '../services/contractService'
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
  verified: boolean
}

function AdminPage() {
  const { showToast } = useToast()
  const [escrows, setEscrows] = useState<Escrow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadAllEscrows()
  }, [])

  const loadAllEscrows = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }
    try {
      const count = await getEscrowCount()
      const escrowPromises = []

      // Load escrows from 1 to count (inclusive)
      for (let i = 1; i <= Number(count); i++) {
        escrowPromises.push(
          getEscrow(i.toString()).catch(err => {
            console.warn(`Failed to load escrow ${i}:`, err)
            return null
          })
        )
      }

      const escrowsData = await Promise.all(escrowPromises)
      const validEscrows = escrowsData
        .map((escrowData, index) => {
          // Skip null/undefined escrows (failed to load or doesn't exist)
          if (!escrowData) return null

          // Double-check that escrow has valid data (buyer and seller are required, amount can be 0 for Created status)
          if (!escrowData.buyer || !escrowData.seller) {
            return null
          }

          return {
            id: (index + 1).toString(),
            buyer: escrowData.buyer,
            seller: escrowData.seller,
            amount: escrowData.amount > 0 ? ethers.formatEther(escrowData.amount) : '0',
            status: escrowData.status,
            statusLabel: getStatusLabel(escrowData.status),
            createdAt: new Date(Number(escrowData.createdAt) * 1000).toISOString(),
            destinationGPS: escrowData.destinationGPS,
            verified: escrowData.verified
          }
        })
        .filter((e): e is Escrow => e !== null)

      setEscrows(validEscrows)
    } catch (error) {
      console.error('Error loading escrows:', error)
      // Don't clear escrows on error, keep existing data
      // setEscrows([])
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (escrowId: string, newStatus: EscrowStatus) => {
    setUpdating(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      // Show loading message
      showToast('Updating status... Please wait for blockchain confirmation.', 'info')

      const response = await fetch(`http://localhost:3001/api/oracle/escrow/${escrowId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          token
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error updating status')
      }

      // Reload escrows after status update
      await loadAllEscrows(false) // Don't show loading spinner on refresh
      setSelectedEscrow(null)
      showToast(result.message || 'Status updated successfully', 'success')
    } catch (error: any) {
      showToast(error.message || 'Error updating status', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin Dashboard</h1>
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-gray-500">Loading orders...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin Dashboard</h1>
      <p className="text-gray-600 mb-6">Manage all orders and manually update status</p>

      {escrows.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <p className="text-gray-600 mb-4 text-lg">No orders found</p>
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
                  Order #{escrow.id}
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
                  <p className="text-sm text-gray-500 mb-1">Shipper</p>
                  <p className="font-mono font-semibold text-gray-800">{formatAddress(escrow.buyer)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Logistics</p>
                  <p className="font-mono font-semibold text-gray-800">{formatAddress(escrow.seller)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Amount</p>
                  <p className="font-semibold text-gray-800">{escrow.amount} ETH</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Verified</p>
                  <p className="font-semibold text-gray-800">{escrow.verified ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedEscrow(escrow)
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  Update Status
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedEscrow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedEscrow(null)}>
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Update Status</h2>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-mono font-semibold">{selectedEscrow.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Status</p>
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold text-white inline-block"
                  style={{ backgroundColor: getStatusColor(selectedEscrow.status) }}
                >
                  {selectedEscrow.statusLabel}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleUpdateStatus(selectedEscrow.id, EscrowStatus.Created)}
                disabled={updating || selectedEscrow.status === EscrowStatus.Created}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Status: Created (Send Request)'}
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedEscrow.id, EscrowStatus.PriceProposed)}
                disabled={updating || selectedEscrow.status === EscrowStatus.PriceProposed}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Status: Price Proposed'}
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedEscrow.id, EscrowStatus.PriceRejected)}
                disabled={updating || selectedEscrow.status === EscrowStatus.PriceRejected}
                className="w-full bg-red-400 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Status: Price Rejected'}
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedEscrow.id, EscrowStatus.Funded)}
                disabled={updating || selectedEscrow.status === EscrowStatus.Funded}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Status: Funded'}
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedEscrow.id, EscrowStatus.InTransit)}
                disabled={updating || selectedEscrow.status === EscrowStatus.InTransit}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Status: In Transit'}
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedEscrow.id, EscrowStatus.Delivered)}
                disabled={updating || selectedEscrow.status === EscrowStatus.Delivered}
                className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Status: Delivered'}
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedEscrow.id, EscrowStatus.Completed)}
                disabled={updating || selectedEscrow.status === EscrowStatus.Completed}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : '✓ Complete (Release Funds to Logistics)'}
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedEscrow.id, EscrowStatus.Refunded)}
                disabled={updating || selectedEscrow.status === EscrowStatus.Refunded}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : '✗ Refund (Return Funds to Shipper)'}
              </button>
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

export default AdminPage

