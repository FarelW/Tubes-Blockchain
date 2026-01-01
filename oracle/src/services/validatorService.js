import config from '../config/iotConfig.js'
import logger from '../utils/logger.js'

class ValidatorService {
  validateDelivery(iotData, destinationGPS, minTemperature, maxTemperature, minHumidity, maxHumidity, minPressure, maxPressure) {
    const gpsResult = this.validateGPS(iotData.gps, destinationGPS);
    const tempResult = this.validateTemperature(
      iotData.temperature,
      minTemperature,
      maxTemperature
    );
    const humidityResult = this.validateHumidity(
      iotData.humidity,
      minHumidity,
      maxHumidity
    );
    const pressureResult = this.validatePressure(
      iotData.pressure,
      minPressure,
      maxPressure
    );

    return {
      gpsMatched: gpsResult.matched,
      gpsDistance: gpsResult.distance,
      temperatureValid: tempResult.valid,
      temperatureDelta: tempResult.delta,
      humidityValid: humidityResult.valid,
      humidityDelta: humidityResult.delta,
      pressureValid: pressureResult.valid,
      pressureDelta: pressureResult.delta,
      verified: gpsResult.matched && tempResult.valid && humidityResult.valid && pressureResult.valid,
      timestamp: Date.now()
    };
  }

  validateGPS(currentGPS, destinationGPS) {
    try {
      const [destLat, destLng] = destinationGPS.split(',').map(Number);

      if (isNaN(destLat) || isNaN(destLng)) {
        logger.error(`Invalid destination GPS format: ${destinationGPS}`);
        return { matched: false, distance: Infinity };
      }

      const distance = this.calculateDistance(
        currentGPS.latitude,
        currentGPS.longitude,
        destLat,
        destLng
      );

      logger.info(`GPS distance: ${distance.toFixed(2)} meters`);

      return {
        matched: distance <= config.GPS_TOLERANCE_METERS,
        distance: distance
      };
    } catch (error) {
      logger.error('GPS validation error:', error);
      return { matched: false, distance: Infinity };
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  validateTemperature(temperature, minTemperature, maxTemperature) {
    const minTemp = minTemperature / 100;
    const maxTemp = maxTemperature / 100;

    const valid = temperature >= minTemp && temperature <= maxTemp;

    let delta = 0;
    if (temperature < minTemp) {
      delta = temperature - minTemp;
    } else if (temperature > maxTemp) {
      delta = temperature - maxTemp;
    }

    logger.info(`Temperature: ${temperature}°C, Range: ${minTemp}°C - ${maxTemp}°C, Valid: ${valid}`);

    return {
      valid,
      delta,
      current: temperature,
      min: minTemp,
      max: maxTemp
    };
  }

  validateHumidity(humidity, minHumidity, maxHumidity) {
    const minHum = minHumidity / 100;
    const maxHum = maxHumidity / 100;

    const valid = humidity >= minHum && humidity <= maxHum;

    let delta = 0;
    if (humidity < minHum) {
      delta = humidity - minHum;
    } else if (humidity > maxHum) {
      delta = humidity - maxHum;
    }

    logger.info(`Humidity: ${humidity}%, Range: ${minHum}% - ${maxHum}%, Valid: ${valid}`);

    return {
      valid,
      delta,
      current: humidity,
      min: minHum,
      max: maxHum
    };
  }

  validatePressure(pressure, minPressure, maxPressure) {
    const minPres = minPressure / 100;
    const maxPres = maxPressure / 100;

    const valid = pressure >= minPres && pressure <= maxPres;

    let delta = 0;
    if (pressure < minPres) {
      delta = pressure - minPres;
    } else if (pressure > maxPres) {
      delta = pressure - maxPres;
    }

    logger.info(`Pressure: ${pressure} hPa, Range: ${minPres} hPa - ${maxPres} hPa, Valid: ${valid}`);

    return {
      valid,
      delta,
      current: pressure,
      min: minPres,
      max: maxPres
    };
  }
}

export default new ValidatorService()

