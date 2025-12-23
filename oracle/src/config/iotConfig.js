/**
 * IoT Configuration
 * Configure IoT API endpoints and validation parameters
 */

export default {
  // IoT Mock API endpoint (for development)
  // In production, replace with real IoT API
  IOT_API_ENDPOINT: process.env.IOT_API_ENDPOINT || 'http://localhost:3001/api/oracle/mock-iot',
  
  // GPS validation
  GPS_TOLERANCE_METERS: 100, // GPS tolerance in meters
  
  // Temperature validation (in Celsius * 100)
  DEFAULT_MIN_TEMP: 0,      // 0°C
  DEFAULT_MAX_TEMP: 3000,   // 30°C
  
  // Polling interval for IoT data (in milliseconds)
  POLLING_INTERVAL: 5000,
  
  // API timeout
  API_TIMEOUT: 10000, // 10 seconds
}
