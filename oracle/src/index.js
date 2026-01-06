import express from 'express'
import cors from 'cors'
import logger from './utils/logger.js'
import oracleRoutes from './routes/oracleRoutes.js'
import authRoutes from './routes/authRoutes.js'
import blockchainService from './services/blockchainService.js'
import { Session } from './models/Session.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`)
  next()
})

app.use('/api/oracle', oracleRoutes)
app.use('/api/auth', authRoutes)

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Logistics Escrow Backend (Oracle + Auth)'
  })
})

setInterval(async () => {
  await Session.deleteExpired()
}, 60 * 60 * 1000)

app.use((err, req, res, next) => {
  logger.error('Error:', err.message)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  })
})

app.listen(PORT, async () => {
  logger.info(`Backend service running on port ${PORT}`)
  logger.info(`Health check: http://localhost:${PORT}/health`)

  try {
    const initialized = await blockchainService.initialize()
    if (initialized) {
      logger.info('✅ Blockchain connection initialized successfully')

      blockchainService.startEventListener()
      logger.info('✅ Event listener started')
    } else {
      logger.error('❌ Blockchain connection initialization failed')
      logger.error('Please check:')
      logger.error('  1. ORACLE_PRIVATE_KEY is set in .env file')
      logger.error('  2. ESCROW_CONTRACT_ADDRESS is set in .env file')
      logger.error('  3. Hardhat node is running on http://127.0.0.1:8545')
      logger.error('  4. Contract is deployed at the specified address')
    }
  } catch (error) {
    logger.error('❌ Failed to initialize blockchain connection:', error.message)
    logger.error('Error stack:', error.stack)
    logger.error('Please check your .env file and ensure Hardhat node is running')
  }
})

process.on('SIGINT', () => {
  logger.info('Shutting down backend service...')
  blockchainService.stopEventListener()
  process.exit(0)
})

export default app
