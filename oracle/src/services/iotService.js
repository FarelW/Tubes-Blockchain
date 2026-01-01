import axios from 'axios'
import config from '../config/iotConfig.js'
import logger from '../utils/logger.js'
import dummyIoTService from './dummyIoTService.js'

class IoTService {
  constructor() {
    this.mockData = new Map();
  }

  async fetchIoTData(escrowId) {
    try {
      const dummyData = dummyIoTService.getCurrentData(escrowId);
      if (dummyData) {
        logger.info(`Using dummy IoT simulation data for escrow ${escrowId}`);
        return {
          gps: dummyData.gps,
          temperature: dummyData.temperature,
          humidity: dummyData.humidity,
          pressure: dummyData.pressure,
          timestamp: dummyData.timestamp,
          sensorId: dummyData.sensorId
        };
      }

      const response = await axios.get(`${config.IOT_API_ENDPOINT}/${escrowId}`, {
        timeout: config.API_TIMEOUT
      });

      return this.validateIoTResponse(response.data);
    } catch (error) {
      logger.warn(`Failed to fetch IoT data from API: ${error.message}`);

      if (this.mockData.has(escrowId)) {
        logger.info(`Using mock data for escrow ${escrowId}`);
        return this.mockData.get(escrowId);
      }

      logger.info(`Generating random mock data for escrow ${escrowId}`);
      return this.generateMockData();
    }
  }

  validateIoTResponse(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid IoT response format');
    }

    if (!data.gps || typeof data.gps.latitude !== 'number' || typeof data.gps.longitude !== 'number') {
      throw new Error('Invalid GPS data in IoT response');
    }

    if (typeof data.temperature !== 'number') {
      throw new Error('Invalid temperature data in IoT response');
    }

    if (typeof data.humidity !== 'number') {
      throw new Error('Invalid humidity data in IoT response');
    }

    if (typeof data.pressure !== 'number') {
      throw new Error('Invalid pressure data in IoT response');
    }

    return {
      gps: {
        latitude: data.gps.latitude,
        longitude: data.gps.longitude
      },
      temperature: data.temperature,
      humidity: data.humidity,
      pressure: data.pressure,
      timestamp: data.timestamp || Date.now(),
      sensorId: data.sensorId || 'unknown'
    };
  }

  generateMockData() {
    return {
      gps: {
        latitude: -6.2088 + (Math.random() - 0.5) * 0.001,
        longitude: 106.8456 + (Math.random() - 0.5) * 0.001
      },
      temperature: 20 + Math.random() * 10,
      humidity: 40 + Math.random() * 30,        // 40-70% humidity
      pressure: 1000 + Math.random() * 30,      // 1000-1030 hPa
      timestamp: Date.now(),
      sensorId: 'mock-sensor-001'
    };
  }

  setMockData(escrowId, data) {
    this.mockData.set(escrowId, {
      gps: data.gps,
      temperature: data.temperature,
      humidity: data.humidity || 50,
      pressure: data.pressure || 1013,
      timestamp: Date.now(),
      sensorId: data.sensorId || 'mock-sensor'
    });
    logger.info(`Mock data set for escrow ${escrowId}`);
  }

  clearMockData(escrowId) {
    if (escrowId) {
      this.mockData.delete(escrowId);
    } else {
      this.mockData.clear();
    }
  }

  getAllMockData() {
    return Object.fromEntries(this.mockData);
  }
}

export default new IoTService()

