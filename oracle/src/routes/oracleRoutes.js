import express from 'express'
import blockchainService from '../services/blockchainService.js'
import iotService from '../services/iotService.js'
import validatorService from '../services/validatorService.js'
import dummyIoTService from '../services/dummyIoTService.js'
import logger from '../utils/logger.js'

const router = express.Router()

router.get('/status', async (req, res) => {
  try {
    const isInitialized = blockchainService.isInitialized()
    const isOracle = isInitialized ? await blockchainService.checkOracleAddress() : false
    const escrowCount = isInitialized ? await blockchainService.getEscrowCount() : BigInt(0)

    res.json({
      status: 'running',
      initialized: isInitialized,
      isRegisteredOracle: isOracle,
      escrowCount: escrowCount.toString(),
      provider: blockchainService.provider !== null,
      wallet: blockchainService.wallet !== null ? blockchainService.wallet.address : null,
      contract: blockchainService.contract !== null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      initialized: blockchainService.isInitialized()
    });
  }
});

router.get('/escrow/:escrowId', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const escrow = await blockchainService.getEscrow(escrowId);

    res.json({
      success: true,
      escrow: {
        id: escrow.id.toString(),
        buyer: escrow.buyer,
        seller: escrow.seller,
        amount: escrow.amount.toString(),
        destinationGPS: escrow.destinationGPS,
        minTemperature: (Number(escrow.minTemperature) / 100).toFixed(2),
        maxTemperature: (Number(escrow.maxTemperature) / 100).toFixed(2),
        deadline: new Date(Number(escrow.deadline) * 1000).toISOString(),
        status: escrow.status,
        verified: escrow.verified,
        createdAt: new Date(Number(escrow.createdAt) * 1000).toISOString()
      }
    });
  } catch (error) {
    logger.error(`Error fetching escrow ${req.params.escrowId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/verify/:escrowId', async (req, res) => {
  try {
    const { escrowId } = req.params;
    logger.info(`Manual verification requested for escrow ${escrowId}`);

    const result = await blockchainService.processVerificationRequest(BigInt(escrowId));

    res.json({
      success: true,
      escrowId,
      verification: result
    });
  } catch (error) {
    logger.error(`Error verifying escrow ${req.params.escrowId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/mock-iot', (req, res) => {
  try {
    const { escrowId, gps, temperature, sensorId } = req.body;

    if (!escrowId || !gps || temperature === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: escrowId, gps, temperature'
      });
    }

    iotService.setMockData(escrowId, {
      gps,
      temperature,
      sensorId
    });

    res.json({
      success: true,
      message: `Mock IoT data set for escrow ${escrowId}`,
      data: {
        escrowId,
        gps,
        temperature,
        sensorId
      }
    });
  } catch (error) {
    logger.error('Error setting mock IoT data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/mock-iot/:escrowId', (req, res) => {
  try {
    const { escrowId } = req.params;

    const allMockData = iotService.getAllMockData();
    if (allMockData[escrowId]) {
      return res.json(allMockData[escrowId]);
    }

    const mockData = iotService.generateMockData();
    res.json(mockData);
  } catch (error) {
    logger.error('Error getting mock IoT data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/mock-iot/:escrowId', (req, res) => {
  try {
    const { escrowId } = req.params;
    iotService.clearMockData(escrowId);

    res.json({
      success: true,
      message: `Mock data cleared for escrow ${escrowId}`
    });
  } catch (error) {
    logger.error('Error clearing mock IoT data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/mock-iot', (req, res) => {
  try {
    iotService.clearMockData();

    res.json({
      success: true,
      message: 'All mock data cleared'
    });
  } catch (error) {
    logger.error('Error clearing all mock IoT data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/validate', (req, res) => {
  try {
    const { iotData, destinationGPS, minTemperature, maxTemperature } = req.body;

    if (!iotData || !destinationGPS) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: iotData, destinationGPS'
      });
    }

    const result = validatorService.validateDelivery(
      iotData,
      destinationGPS,
      minTemperature || 0,
      maxTemperature || 3000
    );

    res.json({
      success: true,
      validation: result
    });
  } catch (error) {
    logger.error('Error validating data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/dummy-iot/start', async (req, res) => {
  try {
    const { escrowId, originGPS, destinationGPS, minTemp, maxTemp, duration } = req.body;

    if (!escrowId || !destinationGPS) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: escrowId, destinationGPS'
      });
    }

    let destGPS = destinationGPS;
    if (typeof destinationGPS === 'string') {
      const [lat, lng] = destinationGPS.split(',').map(Number);
      destGPS = { latitude: lat, longitude: lng };
    }

    let origin = originGPS;
    if (!origin) {
      try {
        const escrow = await blockchainService.getEscrow(escrowId);
        origin = { latitude: -6.1751, longitude: 106.8650 };
      } catch (error) {
        origin = { latitude: -6.1751, longitude: 106.8650 };
      }
    }

    const delivery = dummyIoTService.startDeliverySimulation(escrowId, {
      originGPS: origin,
      destinationGPS: destGPS,
      minTemp: minTemp || 0,
      maxTemp: maxTemp || 30,
      duration: duration || 60000
    });

    res.json({
      success: true,
      message: `Dummy IoT simulation started for escrow ${escrowId}`,
      delivery: {
        escrowId,
        sensorId: delivery.sensorId,
        origin: delivery.origin,
        destination: delivery.destination,
        duration: delivery.duration
      }
    });
  } catch (error) {
    logger.error('Error starting dummy IoT simulation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/dummy-iot/:escrowId', (req, res) => {
  try {
    const { escrowId } = req.params;
    const data = dummyIoTService.getCurrentData(escrowId);

    if (!data) {
      return res.status(404).json({
        success: false,
        error: `No active simulation found for escrow ${escrowId}`
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error getting dummy IoT data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/dummy-iot/:escrowId/history', (req, res) => {
  try {
    const { escrowId } = req.params;
    const history = dummyIoTService.getDeliveryHistory(escrowId);

    res.json({
      success: true,
      escrowId,
      history,
      count: history.length
    });
  } catch (error) {
    logger.error('Error getting delivery history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/dummy-iot/:escrowId/stop', (req, res) => {
  try {
    const { escrowId } = req.params;
    dummyIoTService.stopDeliverySimulation(escrowId);

    res.json({
      success: true,
      message: `Dummy IoT simulation stopped for escrow ${escrowId}`
    });
  } catch (error) {
    logger.error('Error stopping dummy IoT simulation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/dummy-iot', (req, res) => {
  try {
    const deliveries = dummyIoTService.getAllActiveDeliveries();

    res.json({
      success: true,
      deliveries,
      count: deliveries.length
    });
  } catch (error) {
    logger.error('Error getting active deliveries:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/dummy-iot/:escrowId', (req, res) => {
  try {
    const { escrowId } = req.params;
    dummyIoTService.clearDelivery(escrowId);

    res.json({
      success: true,
      message: `Dummy IoT simulation cleared for escrow ${escrowId}`
    });
  } catch (error) {
    logger.error('Error clearing dummy IoT simulation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/dummy-iot', (req, res) => {
  try {
    dummyIoTService.clearAllDeliveries();

    res.json({
      success: true,
      message: 'All dummy IoT simulations cleared'
    });
  } catch (error) {
    logger.error('Error clearing all dummy IoT simulations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Admin update escrow status
 * PUT /api/oracle/escrow/:escrowId/status
 * Requires admin authentication
 */
router.put('/escrow/:escrowId/status', async (req, res) => {
  try {
    const { escrowId } = req.params
    const { status, token } = req.body

    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' })
    }

    // Verify admin user
    const { Session } = await import('../models/Session.js')
    const { User } = await import('../models/User.js')
    
    const session = await Session.findByToken(token)
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const user = await User.findById(session.user_id)
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    if (!status && status !== 0) {
      return res.status(400).json({ error: 'Status is required' })
    }

    // Check if blockchain service is initialized
    if (!blockchainService.isInitialized()) {
      logger.error('Blockchain service not initialized. Check ORACLE_PRIVATE_KEY and ESCROW_CONTRACT_ADDRESS environment variables.')
      return res.status(500).json({ 
        success: false,
        error: 'Contract not initialized. Please ensure ORACLE_PRIVATE_KEY and ESCROW_CONTRACT_ADDRESS are set in environment variables and the oracle server has been restarted.' 
      })
    }

    // Get current escrow status
    const escrow = await blockchainService.getEscrow(escrowId)
    const currentStatus = Number(escrow.status)
    const targetStatus = Number(status)

    // Map status to smart contract functions
    // Note: Smart contract has access control (onlySeller, onlyBuyer, onlyOracle)
    // Admin can use oracle wallet to call functions, but some functions still require specific roles
    let result
    
    if (targetStatus === 2 && (currentStatus === 0 || currentStatus === 1)) {
      // Created/Funded -> InTransit: Use startDelivery
      // Note: This requires seller role, so we'll try using oracle wallet
      // If oracle is not the seller, this will fail
      try {
        result = await blockchainService.adminStartDelivery(BigInt(escrowId))
        return res.json({
          success: true,
          message: 'Status updated to In Transit',
          escrowId,
          transactionHash: result.hash
        })
      } catch (error) {
        return res.status(400).json({ 
          error: `Cannot start delivery: ${error.message}. This function requires seller role. Admin can only update status if oracle wallet matches seller address.` 
        })
      }
    } else if (targetStatus === 3 && currentStatus === 2) {
      // InTransit -> Delivered: Use markDelivered
      try {
        result = await blockchainService.adminMarkDelivered(BigInt(escrowId))
        return res.json({
          success: true,
          message: 'Status updated to Delivered',
          escrowId,
          transactionHash: result.hash
        })
      } catch (error) {
        return res.status(400).json({ 
          error: `Cannot mark delivered: ${error.message}. This function requires seller role. Admin can only update status if oracle wallet matches seller address.` 
        })
      }
    } else if (targetStatus === 4 && (currentStatus === 2 || currentStatus === 3)) {
      // InTransit/Delivered -> Verified: Use verifyDelivery (requires oracle)
      // For admin, we can manually set to Verified, but it's better to use oracle verification
      return res.status(400).json({
        error: 'Status Verified (4) requires oracle verification. Please use the verification endpoint or ensure oracle processes the verification request.'
      })
    } else if (targetStatus === 6 && currentStatus === 5) {
      // Delivered (5) -> Completed (6): Trigger oracle verification first
      try {
        logger.info(`Admin triggered verification for escrow ${escrowId}`)
        
        // Use oracle verification to validate IoT data before completing
        const verificationResult = await blockchainService.processVerificationRequest(BigInt(escrowId))
        
        if (verificationResult.verified) {
          return res.json({
            success: true,
            message: 'Verification passed! Status updated to Completed and funds released.',
            escrowId,
            verification: {
              gpsMatched: verificationResult.gpsMatched,
              temperatureValid: verificationResult.temperatureValid,
              humidityValid: verificationResult.humidityValid,
              pressureValid: verificationResult.pressureValid
            },
            transactionHash: verificationResult.hash
          })
        } else {
          return res.status(400).json({
            success: false,
            message: 'Verification failed! Funds not released.',
            escrowId,
            verification: {
              gpsMatched: verificationResult.gpsMatched,
              temperatureValid: verificationResult.temperatureValid,
              humidityValid: verificationResult.humidityValid,
              pressureValid: verificationResult.pressureValid
            }
          })
        }
      } catch (error) {
        return res.status(400).json({
          error: `Verification failed: ${error.message}`
        })
      }
    } else {
      // For other status changes, use adminUpdateStatus if oracle is owner
      try {
        result = await blockchainService.adminUpdateStatus(BigInt(escrowId), targetStatus)
        return res.json({
          success: true,
          message: `Status updated from ${currentStatus} to ${targetStatus}`,
          escrowId,
          transactionHash: result.hash
        })
      } catch (error) {
        return res.status(400).json({
          error: `Cannot update status: ${error.message}. Make sure oracle wallet is the contract owner or oracle.`
        })
      }
    }
  } catch (error) {
    logger.error(`Error updating escrow status ${req.params.escrowId}:`, error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
