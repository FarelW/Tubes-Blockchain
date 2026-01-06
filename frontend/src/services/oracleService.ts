import { ORACLE_CONFIG } from '../utils/constants'

export interface DummyIoTData {
  gps: {
    latitude: number
    longitude: number
  }
  temperature: number
  humidity?: number
  pressure?: number
  timestamp: number
  sensorId: string
  progress?: number
  status?: string
  origin?: { latitude: number; longitude: number }
  destination?: { latitude: number; longitude: number }
}

export const startDummyIoT = async (
  escrowId: string,
  destinationGPS: string,
  minTemp: number = 0,
  maxTemp: number = 30,
  duration: number = 60000
): Promise<any> => {
  try {
    const response = await fetch(`${ORACLE_CONFIG.endpoint}/dummy-iot/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        escrowId,
        destinationGPS,
        minTemp,
        maxTemp,
        duration
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error starting dummy IoT:', error)
    throw error
  }
}

export const getDummyIoTData = async (escrowId: string): Promise<DummyIoTData | null> => {
  try {
    const response = await fetch(`${ORACLE_CONFIG.endpoint}/dummy-iot/${escrowId}`)
    
    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.success ? data.data : null
  } catch (error) {
    console.error('Error getting dummy IoT data:', error)
    return null
  }
}

export const getDeliveryHistory = async (escrowId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${ORACLE_CONFIG.endpoint}/dummy-iot/${escrowId}/history`)
    
    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.success ? data.history : []
  } catch (error) {
    console.error('Error getting delivery history:', error)
    return []
  }
}

export const stopDummyIoT = async (escrowId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${ORACLE_CONFIG.endpoint}/dummy-iot/${escrowId}/stop`, {
      method: 'POST'
    })

    return response.ok
  } catch (error) {
    console.error('Error stopping dummy IoT:', error)
    return false
  }
}

