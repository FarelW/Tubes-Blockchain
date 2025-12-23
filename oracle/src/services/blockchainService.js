import { ethers } from 'ethers'
import config from '../config/contractConfig.js'
import logger from '../utils/logger.js'

class BlockchainService {
  constructor() {
    this.provider = null
    this.wallet = null
    this.contract = null
    this.eventListener = null
  }

  async initialize() {
    try {
      logger.info('Initializing blockchain service...')
      logger.info(`RPC_URL: ${config.RPC_URL}`)
      logger.info(`ORACLE_PRIVATE_KEY: ${config.ORACLE_PRIVATE_KEY ? '***SET***' : 'NOT SET'}`)
      logger.info(`ESCROW_CONTRACT_ADDRESS: ${config.ESCROW_CONTRACT_ADDRESS}`)
      
      this.provider = new ethers.JsonRpcProvider(config.RPC_URL)
      
      const network = await this.provider.getNetwork()
      logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`)

      if (config.ORACLE_PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(config.ORACLE_PRIVATE_KEY, this.provider)
        logger.info(`Oracle wallet address: ${this.wallet.address}`)

        if (config.ESCROW_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
          this.contract = new ethers.Contract(
            config.ESCROW_CONTRACT_ADDRESS,
            config.ESCROW_CONTRACT_ABI,
            this.wallet
          )
          logger.info(`Contract initialized at: ${config.ESCROW_CONTRACT_ADDRESS}`)
          
          // Verify contract is deployed
          const code = await this.provider.getCode(config.ESCROW_CONTRACT_ADDRESS)
          if (code === '0x') {
            logger.error(`Contract not deployed at address ${config.ESCROW_CONTRACT_ADDRESS}`)
            this.contract = null
          } else {
            logger.info('Contract verified: code exists at address')
          }
        } else {
          logger.error('Contract address not set. Please deploy contract and update config.')
          logger.error('Set ESCROW_CONTRACT_ADDRESS in .env file')
        }
      } else {
        logger.error('Oracle private key not set. Will not be able to send transactions.')
        logger.error('Set ORACLE_PRIVATE_KEY in .env file')
      }

      // Final status check
      const initialized = this.isInitialized()
      if (initialized) {
        logger.info('✅ Blockchain service fully initialized')
      } else {
        logger.error('❌ Blockchain service initialization incomplete')
      }

      return initialized
    } catch (error) {
      logger.error('Failed to initialize blockchain connection:', error)
      logger.error('Error details:', error.message)
      logger.error('Stack:', error.stack)
      throw error
    }
  }

  startEventListener() {
    if (!this.contract) {
      logger.warn('Contract not initialized. Cannot start event listener.')
      return
    }

    logger.info('Starting event listener for VerificationRequested events...')

    // Listen to DeliveryMarked event instead of VerificationRequested
    // Oracle will only verify when admin explicitly requests it
    this.contract.on('DeliveryMarked', async (escrowId, seller, event) => {
      logger.info(`DeliveryMarked event received for escrow ${escrowId} from ${seller}`)
      logger.info(`Escrow ${escrowId} marked as delivered. Waiting for admin verification.`)
      // Don't auto-verify - admin will verify manually
    })

    this.eventListener = true
  }

  stopEventListener() {
    if (this.contract && this.eventListener) {
      this.contract.removeAllListeners('VerificationRequested')
      this.eventListener = false
      logger.info('Event listener stopped')
    }
  }

  async processVerificationRequest(escrowId) {
    const { default: iotService } = await import('./iotService.js')
    const { default: validatorService } = await import('./validatorService.js')
    const { default: dummyIoTService } = await import('./dummyIoTService.js')

    try {
      const escrow = await this.getEscrow(escrowId)
      logger.info(`Processing verification for escrow ${escrowId}`)
      logger.info(`Current status: ${escrow.status}, Verified: ${escrow.verified}`)
      logger.info(`Destination GPS: ${escrow.destinationGPS}`)
      logger.info(`Temperature range: ${escrow.minTemperature/100}°C - ${escrow.maxTemperature/100}°C`)

      // Check if escrow is already verified or completed
      if (escrow.verified) {
        logger.warn(`Escrow ${escrowId} is already verified. Skipping verification.`)
        return { alreadyVerified: true }
      }

      // Check if escrow status is Delivered (3) - only verify if status is Delivered
      if (escrow.status !== 3) { // 3 = Delivered
        logger.warn(`Escrow ${escrowId} status is ${escrow.status}, not Delivered (3). Skipping verification.`)
        return { statusNotReady: true, currentStatus: escrow.status }
      }

      // Check if dummy IoT simulation is active - wait a bit if not ready
      const dummyData = dummyIoTService.getCurrentData(escrowId.toString())
      if (!dummyData || dummyData.status !== 'delivered') {
        logger.info(`Waiting for delivery simulation to complete for escrow ${escrowId}...`)
        // Wait up to 10 seconds for delivery simulation
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          const updatedData = dummyIoTService.getCurrentData(escrowId.toString())
          if (updatedData && updatedData.status === 'delivered') {
            break
          }
        }
      }

      const iotData = await iotService.fetchIoTData(escrowId.toString())
      logger.info(`IoT data received: GPS=${iotData.gps.latitude},${iotData.gps.longitude}, Temp=${iotData.temperature}°C`)

      const validation = validatorService.validateDelivery(
        iotData,
        escrow.destinationGPS,
        Number(escrow.minTemperature),
        Number(escrow.maxTemperature)
      )
      logger.info(`Validation result: GPS matched=${validation.gpsMatched}, Temp valid=${validation.temperatureValid}`)

      // Always submit verification (even if validation fails) - contract will handle it
      // But only if validation passes, funds will be released
      await this.submitVerification(
        escrowId,
        `${iotData.gps.latitude},${iotData.gps.longitude}`,
        Math.round(iotData.temperature * 100),
        validation.gpsMatched,
        validation.temperatureValid
      )
      
      if (validation.gpsMatched && validation.temperatureValid) {
        logger.info(`Verification submitted and funds released for escrow ${escrowId}`)
      } else {
        logger.warn(`Verification submitted but failed for escrow ${escrowId}. GPS matched: ${validation.gpsMatched}, Temp valid: ${validation.temperatureValid}. Funds will NOT be released.`)
      }

      return validation
    } catch (error) {
      logger.error(`Failed to process verification for escrow ${escrowId}:`, error)
      throw error
    }
  }

  async getEscrow(escrowId) {
    if (!this.contract) {
      throw new Error('Contract not initialized')
    }

    const escrow = await this.contract.getEscrow(escrowId)
    return {
      id: escrow.id,
      buyer: escrow.buyer,
      seller: escrow.seller,
      amount: escrow.amount,
      destinationGPS: escrow.destinationGPS,
      minTemperature: escrow.minTemperature,
      maxTemperature: escrow.maxTemperature,
      deadline: escrow.deadline,
      status: escrow.status,
      verified: escrow.verified,
      createdAt: escrow.createdAt,
      verifiedAt: escrow.verifiedAt
    }
  }

  async submitVerification(escrowId, currentGPS, temperature, gpsMatched, temperatureValid) {
    if (!this.contract) {
      throw new Error('Contract not initialized')
    }

    const tx = await this.contract.verifyDelivery(
      escrowId,
      currentGPS,
      temperature,
      gpsMatched,
      temperatureValid
    )

    logger.info(`Transaction submitted: ${tx.hash}`)
    
    const receipt = await tx.wait()
    logger.info(`Transaction confirmed in block ${receipt.blockNumber}`)

    return receipt
  }

  async getEscrowCount() {
    if (!this.contract) {
      throw new Error('Contract not initialized')
    }
    return await this.contract.escrowCounter()
  }

  async checkOracleAddress() {
    if (!this.contract || !this.wallet) {
      return false
    }
    const oracleAddress = await this.contract.oracle()
    return oracleAddress.toLowerCase() === this.wallet.address.toLowerCase()
  }

  isInitialized() {
    return this.contract !== null && this.wallet !== null && this.provider !== null
  }
  
  getInitializationStatus() {
    return {
      provider: this.provider !== null,
      wallet: this.wallet !== null,
      contract: this.contract !== null,
      walletAddress: this.wallet ? this.wallet.address : null,
      contractAddress: config.ESCROW_CONTRACT_ADDRESS,
      allInitialized: this.isInitialized()
    }
  }

  async adminStartDelivery(escrowId) {
    if (!this.contract) {
      throw new Error('Contract not initialized')
    }
    
    // Admin can call startDelivery if they have seller wallet or use oracle
    // For now, we'll try to call it - it will fail if caller is not seller
    // In production, admin should use seller's wallet or oracle should have special permission
    const tx = await this.contract.startDelivery(escrowId)
    const receipt = await tx.wait()
    return receipt
  }

  async adminMarkDelivered(escrowId) {
    if (!this.contract) {
      throw new Error('Contract not initialized')
    }
    
    const tx = await this.contract.markDelivered(escrowId)
    const receipt = await tx.wait()
    return receipt
  }

  async adminUpdateStatus(escrowId, newStatus) {
    if (!this.contract) {
      throw new Error('Contract not initialized')
    }
    
    // Check if wallet is owner or oracle
    const owner = await this.contract.owner()
    const oracleAddress = await this.contract.oracle()
    const isOwner = this.wallet.address.toLowerCase() === owner.toLowerCase()
    const isOracle = this.wallet.address.toLowerCase() === oracleAddress.toLowerCase()
    
    if (!isOwner && !isOracle) {
      throw new Error('Only contract owner or oracle can update status. Oracle wallet is neither owner nor oracle.')
    }
    
    const tx = await this.contract.adminUpdateStatus(escrowId, newStatus)
    const receipt = await tx.wait()
    return receipt
  }
}

export default new BlockchainService()
