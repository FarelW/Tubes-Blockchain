import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { getUserEscrows, getEscrow } from '../services/contractService'
import { getAccount } from '../services/web3Service'
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

function EscrowDashboard() {
  const [escrows, setEscrows] = useState<Escrow[]>([])
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<string | null>(null)

  useEffect(() => {
    checkWallet()
  }, [])

  useEffect(() => {
    if (account) {
      loadEscrows()
    }
  }, [account])

  const checkWallet = async () => {
    const acc = await getAccount()
    if (acc) {
      setAccount(acc)
    }
  }

  const loadEscrows = async () => {
    if (!account) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const escrowIds = await getUserEscrows(account)
      
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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Escrow Dashboard</h1>
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-gray-500">Loading escrows...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Escrow Dashboard</h1>
        <Link
          to="/create"
          className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition"
        >
          + Create New Escrow
        </Link>
      </div>


      {escrows.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <p className="text-gray-600 mb-4 text-lg">No escrows found</p>
          <Link
            to="/create"
            className="inline-block bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition"
          >
            Create Your First Escrow
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {escrows.map((escrow) => (
            <div key={escrow.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-4 pb-4 border-b">
                <h3 className="text-xl font-bold font-mono text-gray-800">
                  Escrow #{escrow.id.slice(0, 8)}
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
              </div>

              <div className="pt-4 border-t">
                <Link
                  to={`/tracking/${escrow.id}`}
                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  Track Delivery
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EscrowDashboard
