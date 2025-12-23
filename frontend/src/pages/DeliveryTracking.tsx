import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useRole } from '../contexts/RoleContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getEscrow, getVerification, startDelivery, markDelivered } from '../services/contractService'
import { getDummyIoTData, startDummyIoT } from '../services/oracleService'
import { EscrowStatus, getStatusLabel } from '../utils/constants'

interface TrackingData {
  escrowId: string
  currentGPS: { lat: number; lng: number }
  destinationGPS: { lat: number; lng: number }
  temperature: number
  status: EscrowStatus
  statusLabel: string
  verified: boolean
  minTemp: number
  maxTemp: number
}

function DeliveryTracking() {
  const { currentRole } = useRole()
  const { authenticatedAccount } = useAuth()
  const { showToast } = useToast()
  const { escrowId } = useParams<{ escrowId: string }>()
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLogistics, setIsLogistics] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    checkAccount()
    loadTrackingData()
    // No auto-refresh - user can manually refresh if needed
  }, [escrowId, authenticatedAccount])

  const checkAccount = async () => {
    if (currentRole === 'logistics' && authenticatedAccount && escrowId) {
      const escrowData = await getEscrow(escrowId)
      if (escrowData && escrowData.seller.toLowerCase() === authenticatedAccount.toLowerCase()) {
        setIsLogistics(true)
      }
    } else if (currentRole === 'logistics') {
      setIsLogistics(true)
    }
  }

  const loadTrackingData = async () => {
    if (!escrowId) {
      setLoading(false)
      return
    }

    try {
      const escrowData = await getEscrow(escrowId)
      if (!escrowData) {
        setLoading(false)
        return
      }

      const [destLat, destLng] = escrowData.destinationGPS.split(',').map(Number)
      const verificationData = await getVerification(escrowId)

      let currentGPS = { lat: destLat, lng: destLng }
      let temperature = (Number(escrowData.minTemperature) + Number(escrowData.maxTemperature)) / 200

      const iotData = await getDummyIoTData(escrowId)
      if (iotData) {
        currentGPS = {
          lat: iotData.gps.latitude,
          lng: iotData.gps.longitude
        }
        temperature = iotData.temperature
      }

      if (verificationData && verificationData.currentGPS) {
        const [verLat, verLng] = verificationData.currentGPS.split(',').map(Number)
        currentGPS = { lat: verLat, lng: verLng }
        temperature = Number(verificationData.temperature) / 100
      }

      const trackingData: TrackingData = {
        escrowId: escrowId,
        currentGPS,
        destinationGPS: { lat: destLat, lng: destLng },
        temperature,
        status: escrowData.status,
        statusLabel: getStatusLabel(escrowData.status),
        verified: escrowData.verified,
        minTemp: Number(escrowData.minTemperature) / 100,
        maxTemp: Number(escrowData.maxTemperature) / 100
      }

      setTrackingData(trackingData)
    } catch (error) {
      console.error('Error loading tracking data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const handleStartDelivery = async () => {
    if (!escrowId) return
    setActionLoading(true)
    try {
      await startDelivery(escrowId)
      showToast('Delivery started successfully!', 'success')
      loadTrackingData()
    } catch (error: any) {
      showToast(`Error: ${error?.reason || error?.message || 'Failed to start delivery'}`, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartDummyIoT = async () => {
    if (!escrowId || !trackingData) return
    setActionLoading(true)
    try {
      await startDummyIoT(
        escrowId,
        trackingData.destinationGPS.lat + ',' + trackingData.destinationGPS.lng,
        trackingData.minTemp,
        trackingData.maxTemp,
        60000
      )
      showToast('IoT simulation started!', 'success')
      loadTrackingData()
    } catch (error: any) {
      showToast(`Error: ${error?.message || 'Failed to start IoT simulation'}`, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkDelivered = async () => {
    if (!escrowId) return
    setActionLoading(true)
    try {
      await markDelivered(escrowId)
      showToast('Marked as delivered! Oracle will verify automatically.', 'success')
      loadTrackingData()
    } catch (error: any) {
      showToast(`Error: ${error?.reason || error?.message || 'Failed to mark delivered'}`, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Delivery Tracking</h1>
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-gray-500">Loading tracking data...</div>
        </div>
      </div>
    )
  }

  if (!trackingData) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Delivery Tracking</h1>
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <div className="text-red-500">Tracking data not found</div>
        </div>
      </div>
    )
  }

  const distance = calculateDistance(
    trackingData.currentGPS.lat,
    trackingData.currentGPS.lng,
    trackingData.destinationGPS.lat,
    trackingData.destinationGPS.lng
  )

  const isAtDestination = distance < 0.1
  const tempStatus = trackingData.temperature >= trackingData.minTemp &&
    trackingData.temperature <= trackingData.maxTemp ? 'safe' : 'warning'

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Delivery Tracking</h1>
      <p className="text-gray-600 mb-8 font-mono">Escrow ID: {trackingData.escrowId}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Status</h3>
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold text-white mb-2 ${trackingData.status === EscrowStatus.Completed ? 'bg-green-500' :
            trackingData.status === EscrowStatus.InTransit ? 'bg-blue-500' :
              trackingData.status === EscrowStatus.Delivered ? 'bg-yellow-500' :
                'bg-gray-500'
            }`}>
            {trackingData.statusLabel}
          </div>
          {trackingData.verified && (
            <div className="mt-2 inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
              ✓ Verified by Oracle
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">GPS Location</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Current:</span>
              <span className="font-mono font-semibold text-gray-800">
                {trackingData.currentGPS.lat.toFixed(4)}, {trackingData.currentGPS.lng.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Destination:</span>
              <span className="font-mono font-semibold text-gray-800">
                {trackingData.destinationGPS.lat.toFixed(4)}, {trackingData.destinationGPS.lng.toFixed(4)}
              </span>
            </div>
            <div className="pt-2 border-t">
              <span className="font-semibold text-gray-800">Distance: {distance.toFixed(2)} km</span>
              {isAtDestination && (
                <span className="ml-2 text-green-600 font-semibold">✓ At destination</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Temperature</h3>
          <div className={`p-4 rounded-lg text-center ${tempStatus === 'safe' ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'
            }`}>
            <div className="text-3xl font-bold mb-1">{trackingData.temperature.toFixed(1)}°C</div>
            <div className="text-sm font-semibold">
              {tempStatus === 'safe' ? '✓ Safe' : '⚠ Warning'}
            </div>
            <div className="text-xs mt-2 text-gray-600">
              Range: {trackingData.minTemp}°C - {trackingData.maxTemp}°C
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Verification Status</h3>
        <div className="space-y-2">
          <div className={`p-3 rounded-lg ${isAtDestination ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'
            }`}>
            {isAtDestination ? '✓' : '○'} GPS matches destination
          </div>
          <div className={`p-3 rounded-lg ${tempStatus === 'safe' ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'
            }`}>
            {tempStatus === 'safe' ? '✓' : '○'} Temperature within range
          </div>
          <div className={`p-3 rounded-lg ${trackingData.verified ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'
            }`}>
            {trackingData.verified ? '✓' : '○'} Oracle verification complete
          </div>
        </div>
      </div>

      {isLogistics && (trackingData.status === EscrowStatus.Funded || trackingData.status === EscrowStatus.Created) && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <button
            onClick={handleStartDelivery}
            disabled={actionLoading}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {actionLoading ? 'Processing...' : 'Start Delivery'}
          </button>
        </div>
      )}

      {isLogistics && trackingData.status === EscrowStatus.InTransit && (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-3">
          <button
            onClick={handleStartDummyIoT}
            disabled={actionLoading}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Starting...' : 'Start IoT Simulation'}
          </button>
          <button
            onClick={handleMarkDelivered}
            disabled={actionLoading}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {actionLoading ? 'Processing...' : 'Mark Delivered'}
          </button>
        </div>
      )}
    </div>
  )
}

export default DeliveryTracking
