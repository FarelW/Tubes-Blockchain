export default {
  IOT_API_ENDPOINT: process.env.IOT_API_ENDPOINT || 'http://localhost:3001/api/oracle/mock-iot',
  GPS_TOLERANCE_METERS: 100,
  DEFAULT_MIN_TEMP: 0,
  DEFAULT_MAX_TEMP: 3000,
  POLLING_INTERVAL: 5000,
  API_TIMEOUT: 10000,
}
