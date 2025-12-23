import logger from '../utils/logger.js'

class DummyIoTService {
  constructor() {
    this.activeDeliveries = new Map();
    this.simulationIntervals = new Map();
  }

  startDeliverySimulation(escrowId, config) {
    const {
      originGPS = { latitude: -6.1751, longitude: 106.8650 }, // Jakarta origin
      destinationGPS,
      minTemp = 0,
      maxTemp = 30,
      duration = 60000 // 60 seconds default
    } = config;

    // Parse destination GPS if string
    let destLat, destLng;
    if (typeof destinationGPS === 'string') {
      [destLat, destLng] = destinationGPS.split(',').map(Number);
    } else {
      destLat = destinationGPS.latitude;
      destLng = destinationGPS.longitude;
    }

    const delivery = {
      escrowId,
      origin: { latitude: originGPS.latitude, longitude: originGPS.longitude },
      destination: { latitude: destLat, longitude: destLng },
      currentGPS: { latitude: originGPS.latitude, longitude: originGPS.longitude },
      temperature: minTemp + (maxTemp - minTemp) / 2,
      minTemp,
      maxTemp,
      startTime: Date.now(),
      duration,
      progress: 0,
      status: 'in_transit',
      sensorId: `sensor-${escrowId}-${Date.now()}`,
      history: []
    };

    this.activeDeliveries.set(escrowId, delivery);

    const steps = Math.floor(duration / 2000);
    const latStep = (destLat - originGPS.latitude) / steps;
    const lngStep = (destLng - originGPS.longitude) / steps;

    let stepCount = 0;
    const interval = setInterval(() => {
      stepCount++;
      const progress = Math.min(stepCount / steps, 1);

      delivery.currentGPS = {
        latitude: originGPS.latitude + (latStep * stepCount),
        longitude: originGPS.longitude + (lngStep * stepCount)
      };

      const baseTemp = minTemp + (maxTemp - minTemp) * 0.5;
      const variation = (Math.random() - 0.5) * 5;
      delivery.temperature = Math.max(minTemp, Math.min(maxTemp, baseTemp + variation));

      delivery.progress = progress;
      delivery.timestamp = Date.now();

      delivery.history.push({
        gps: { ...delivery.currentGPS },
        temperature: delivery.temperature,
        timestamp: delivery.timestamp,
        progress
      });
      if (delivery.history.length > 50) {
        delivery.history.shift();
      }

      if (progress >= 1) {
        delivery.status = 'delivered';
        delivery.currentGPS = { latitude: destLat, longitude: destLng };
        this.stopDeliverySimulation(escrowId);
        logger.info(`Delivery simulation completed for escrow ${escrowId}`);
      }
    }, 2000);

    this.simulationIntervals.set(escrowId, interval);
    logger.info(`Started delivery simulation for escrow ${escrowId}`);

    return delivery;
  }

  stopDeliverySimulation(escrowId) {
    const interval = this.simulationIntervals.get(escrowId);
    if (interval) {
      clearInterval(interval);
      this.simulationIntervals.delete(escrowId);
    }

    const delivery = this.activeDeliveries.get(escrowId);
    if (delivery) {
      delivery.status = 'stopped';
    }

    logger.info(`Stopped delivery simulation for escrow ${escrowId}`);
  }

  getCurrentData(escrowId) {
    const delivery = this.activeDeliveries.get(escrowId);

    if (!delivery) {
      return null;
    }

    return {
      gps: {
        latitude: delivery.currentGPS.latitude,
        longitude: delivery.currentGPS.longitude
      },
      temperature: delivery.temperature,
      timestamp: delivery.timestamp || Date.now(),
      sensorId: delivery.sensorId,
      progress: delivery.progress,
      status: delivery.status,
      origin: delivery.origin,
      destination: delivery.destination
    };
  }

  getDeliveryHistory(escrowId) {
    const delivery = this.activeDeliveries.get(escrowId);
    return delivery ? delivery.history : [];
  }

  getAllActiveDeliveries() {
    const deliveries = [];
    for (const [escrowId, delivery] of this.activeDeliveries.entries()) {
      deliveries.push({
        escrowId,
        currentGPS: delivery.currentGPS,
        temperature: delivery.temperature,
        progress: delivery.progress,
        status: delivery.status,
        timestamp: delivery.timestamp
      });
    }
    return deliveries;
  }

  isActive(escrowId) {
    return this.activeDeliveries.has(escrowId) &&
      this.activeDeliveries.get(escrowId).status === 'in_transit';
  }

  clearDelivery(escrowId) {
    this.stopDeliverySimulation(escrowId);
    this.activeDeliveries.delete(escrowId);
  }

  clearAllDeliveries() {
    for (const escrowId of this.activeDeliveries.keys()) {
      this.stopDeliverySimulation(escrowId);
    }
    this.activeDeliveries.clear();
  }
}

export default new DummyIoTService()

