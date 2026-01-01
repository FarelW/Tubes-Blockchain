import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../contexts/RoleContext'
import { useToast } from '../contexts/ToastContext'
import { createEscrow } from '../services/contractService'
import { getLogistics } from '../services/authService'
import { ethers } from 'ethers'

function CreateEscrow() {
  const { authenticatedRole, authenticatedAccount } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [logisticsList, setLogisticsList] = useState<Array<{ id: number; username: string; email: string; walletAddress: string }>>([])
  const [loadingLogistics, setLoadingLogistics] = useState(true)

  useEffect(() => {
    // Get wallet address from authenticatedAccount or localStorage user object
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setWalletAddress(user.walletAddress || authenticatedAccount || null)
      } catch (error) {
        setWalletAddress(authenticatedAccount || null)
      }
    } else {
      setWalletAddress(authenticatedAccount || null)
    }
    loadLogistics()
  }, [authenticatedAccount])

  const loadLogistics = async () => {
    setLoadingLogistics(true)
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        const result = await getLogistics(token)
        if (result.success && result.logistics) {
          setLogisticsList(result.logistics)
        }
      }
    } catch (error) {
      console.error('Error loading logistics:', error)
    } finally {
      setLoadingLogistics(false)
    }
  }

  if (authenticatedRole !== UserRole.SHIPPER) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <p className="text-gray-600">
            Only shippers can create escrows.
          </p>
        </div>
      </div>
    )
  }
  const [formData, setFormData] = useState({
    logisticsAddress: '',
    destinationGPS: '',
    minTemperature: '',
    maxTemperature: '',
    minHumidity: '',
    maxHumidity: '',
    minPressure: '',
    maxPressure: '',
    deadline: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const validateAddress = (address: string): boolean => {
    try {
      return ethers.isAddress(address)
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation: Must have wallet connected
    if (!walletAddress) {
      showToast('Please connect your wallet in the Account page first', 'error')
      return
    }

    // Validation: Wallet address must be valid
    if (!validateAddress(walletAddress)) {
      showToast('Your wallet address is not valid. Please update it in the Account page.', 'error')
      return
    }

    // Validation: Logistics address must be valid
    if (!validateAddress(formData.logisticsAddress)) {
      showToast('Logistics address is not valid. Please select a valid logistics provider.', 'error')
      return
    }

    if (!window.ethereum) {
      showToast('Please install MetaMask wallet first!', 'error')
      return
    }

    // Request account access - this will show MetaMask popup
    let account: string | null = null
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      account = await signer.getAddress()
    } catch (error: any) {
      if (error.code === 4001) {
        showToast('Please approve account access in MetaMask to continue.', 'error')
      } else {
        showToast('Failed to connect wallet. Please try again.', 'error')
      }
      return
    }

    if (!account) {
      showToast('Please connect your MetaMask wallet first!', 'error')
      return
    }

    // CRITICAL: Validate that connected wallet matches registered wallet address
    if (walletAddress && account.toLowerCase() !== walletAddress.toLowerCase()) {
      showToast(
        `Connected wallet (${account.slice(0, 6)}...${account.slice(-4)}) does not match your registered shipper wallet (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}). Please switch to your registered account in MetaMask or update your wallet address in the Account page.`,
        'error'
      )
      return
    }

    setLoading(true)
    try {
      await createEscrow(
        formData.logisticsAddress,
        formData.destinationGPS,
        parseFloat(formData.minTemperature),
        parseFloat(formData.maxTemperature),
        parseFloat(formData.minHumidity),
        parseFloat(formData.maxHumidity),
        parseFloat(formData.minPressure),
        parseFloat(formData.maxPressure),
        parseInt(formData.deadline)
      )

      showToast('Escrow request created successfully! Logistics provider will set the price and approve or reject your request.', 'success')
      navigate('/dashboard')
    } catch (error: any) {
      console.error('Error creating escrow:', error)
      const errorMessage = error?.reason || error?.message || 'Failed to create escrow. Please try again.'
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Create New Escrow</h1>
      <p className="text-gray-600 mb-4">
        Create a new escrow request. Logistics provider will set the price and approve or reject your request.
        You will pay after the logistics provider approves.
      </p>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> After you create this request, the logistics provider will review it and set a price. 
          If they approve, you will pay the proposed amount. If they reject, the request will be cancelled.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md">
        <div className="space-y-6">

          <div>
            <label htmlFor="logisticsAddress" className="block text-sm font-semibold text-gray-700 mb-2">
              Select Logistics Provider
            </label>
            {loadingLogistics ? (
              <div className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-100">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : logisticsList.length === 0 ? (
              <div className="w-full px-4 py-2 border-2 border-red-300 rounded-lg bg-red-50">
                <p className="text-red-600 text-sm">No validated logistics providers available. Please wait for logistics providers to connect their wallets.</p>
              </div>
            ) : (
              <select
                id="logisticsAddress"
                name="logisticsAddress"
                value={formData.logisticsAddress}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
              >
                <option value="">Select a logistics provider</option>
                {logisticsList.map((logistics) => (
                  <option key={logistics.id} value={logistics.walletAddress}>
                    {logistics.username} ({logistics.email}) - {logistics.walletAddress.slice(0, 10)}...
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="destinationGPS" className="block text-sm font-semibold text-gray-700 mb-2">
              Destination GPS Coordinates
            </label>
            <input
              type="text"
              id="destinationGPS"
              name="destinationGPS"
              value={formData.destinationGPS}
              onChange={handleChange}
              placeholder="-6.2088,106.8456"
              required
              pattern="^-?\d+\.?\d*,-?\d+\.?\d*$"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="minTemperature" className="block text-sm font-semibold text-gray-700 mb-2">
                Min Temperature (°C)
              </label>
              <input
                type="number"
                id="minTemperature"
                name="minTemperature"
                value={formData.minTemperature}
                onChange={handleChange}
                placeholder="0"
                step="0.1"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="maxTemperature" className="block text-sm font-semibold text-gray-700 mb-2">
                Max Temperature (°C)
              </label>
              <input
                type="number"
                id="maxTemperature"
                name="maxTemperature"
                value={formData.maxTemperature}
                onChange={handleChange}
                placeholder="30"
                step="0.1"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="minHumidity" className="block text-sm font-semibold text-gray-700 mb-2">
                Min Humidity (%)
              </label>
              <input
                type="number"
                id="minHumidity"
                name="minHumidity"
                value={formData.minHumidity}
                onChange={handleChange}
                placeholder="30"
                step="0.1"
                min="0"
                max="100"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="maxHumidity" className="block text-sm font-semibold text-gray-700 mb-2">
                Max Humidity (%)
              </label>
              <input
                type="number"
                id="maxHumidity"
                name="maxHumidity"
                value={formData.maxHumidity}
                onChange={handleChange}
                placeholder="70"
                step="0.1"
                min="0"
                max="100"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="minPressure" className="block text-sm font-semibold text-gray-700 mb-2">
                Min Pressure (hPa)
              </label>
              <input
                type="number"
                id="minPressure"
                name="minPressure"
                value={formData.minPressure}
                onChange={handleChange}
                placeholder="980"
                step="0.1"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="maxPressure" className="block text-sm font-semibold text-gray-700 mb-2">
                Max Pressure (hPa)
              </label>
              <input
                type="number"
                id="maxPressure"
                name="maxPressure"
                value={formData.maxPressure}
                onChange={handleChange}
                placeholder="1030"
                step="0.1"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-semibold text-gray-700 mb-2">
              Deadline (days)
            </label>
            <input
              type="number"
              id="deadline"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              placeholder="7"
              min="1"
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creating...' : 'Create Escrow'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateEscrow

