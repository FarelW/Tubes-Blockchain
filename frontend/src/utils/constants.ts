// Contract addresses (update after deployment)
export const ESCROW_CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 31337, // Hardhat local network
  chainName: 'Localhost (Hardhat)',
  rpcUrl: 'http://127.0.0.1:8545',
  blockExplorer: ''
}

// Escrow status enum (should match smart contract)
export enum EscrowStatus {
  Created = 0,        // Shipper sends request (no payment yet)
  PriceProposed = 1,  // Logistics proposed price (waiting for shipper payment)
  PriceRejected = 2, // Logistics rejected the request
  Funded = 3,         // Shipper paid (approved and funded)
  InTransit = 4,      // Logistics delivering
  Delivered = 5,      // Logistics marked as delivered
  Completed = 6,      // Admin verified and completed
  Refunded = 7,       // Funds refunded to shipper
  Disputed = 8        // Dispute raised
}

// Contract ABI (matches EscrowContract.sol)
export const ESCROW_CONTRACT_ABI = [
  // Events
  'event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, string destinationGPS, uint256 deadline)',
  'event PriceProposed(uint256 indexed escrowId, address indexed seller, uint256 amount)',
  'event PriceRejected(uint256 indexed escrowId, address indexed seller)',
  'event EscrowFunded(uint256 indexed escrowId, uint256 amount)',
  'event EscrowApproved(uint256 indexed escrowId, address indexed seller)',
  'event DeliveryStarted(uint256 indexed escrowId, uint256 timestamp)',
  'event DeliveryMarked(uint256 indexed escrowId, address indexed seller)',
  'event VerificationRequested(uint256 indexed escrowId, address indexed requester)',
  'event DeliveryVerified(uint256 indexed escrowId, bool gpsMatched, bool temperatureValid, bool humidityValid, bool pressureValid, bool verified)',
  'event FundsReleased(uint256 indexed escrowId, address indexed recipient, uint256 amount)',
  'event EscrowRefunded(uint256 indexed escrowId, address indexed buyer, uint256 amount)',
  'event StatusUpdated(uint256 indexed escrowId, uint8 oldStatus, uint8 newStatus)',

  // Read functions
  'function getEscrow(uint256 escrowId) view returns (tuple(uint256 id, address buyer, address seller, uint256 amount, string destinationGPS, int256 minTemperature, int256 maxTemperature, int256 minHumidity, int256 maxHumidity, int256 minPressure, int256 maxPressure, uint256 deadline, uint8 status, bool verified, uint256 createdAt, uint256 verifiedAt))',
  'function getVerification(uint256 escrowId) view returns (tuple(string currentGPS, int256 temperature, int256 humidity, int256 pressure, uint256 timestamp, bool gpsMatched, bool temperatureValid, bool humidityValid, bool pressureValid))',
  'function getUserEscrows(address user) view returns (uint256[])',
  'function getEscrowStatus(uint256 escrowId) view returns (uint8)',
  'function isEscrowActive(uint256 escrowId) view returns (bool)',
  'function escrowCounter() view returns (uint256)',
  'function oracle() view returns (address)',
  'function owner() view returns (address)',

  // Write functions
  'function createEscrow(address seller, string destinationGPS, int256 minTemperature, int256 maxTemperature, int256 minHumidity, int256 maxHumidity, int256 minPressure, int256 maxPressure, uint256 deadline) returns (uint256)',
  'function setPriceAndApprove(uint256 escrowId, uint256 amount)',
  'function rejectPrice(uint256 escrowId)',
  'function fundEscrow(uint256 escrowId) payable',
  'function approveEscrow(uint256 escrowId)',
  'function startDelivery(uint256 escrowId)',
  'function markDelivered(uint256 escrowId)',
  'function requestVerification(uint256 escrowId)',
  'function refund(uint256 escrowId)',
  'function verifyDelivery(uint256 escrowId, string memory currentGPS, int256 temperature, int256 humidity, int256 pressure, bool gpsMatched, bool temperatureValid, bool humidityValid, bool pressureValid)',
  'function adminUpdateStatus(uint256 escrowId, uint8 newStatus)'
]

// Oracle configuration
export const ORACLE_CONFIG = {
  endpoint: 'http://localhost:3001/api/oracle',
  pollingInterval: 5000 // 5 seconds
}

// Helper function to get status label
export const getStatusLabel = (status: EscrowStatus): string => {
  const labels: Record<EscrowStatus, string> = {
    [EscrowStatus.Created]: 'Send Request',
    [EscrowStatus.PriceProposed]: 'Price Proposed',
    [EscrowStatus.PriceRejected]: 'Price Rejected',
    [EscrowStatus.Funded]: 'Funded',
    [EscrowStatus.InTransit]: 'Delivering',
    [EscrowStatus.Delivered]: 'Delivered',
    [EscrowStatus.Completed]: 'Completed',
    [EscrowStatus.Refunded]: 'Refunded',
    [EscrowStatus.Disputed]: 'Disputed'
  }
  return labels[status] || 'Unknown'
}

// Helper function to get status color
export const getStatusColor = (status: EscrowStatus): string => {
  const colors: Record<EscrowStatus, string> = {
    [EscrowStatus.Created]: '#9e9e9e',
    [EscrowStatus.PriceProposed]: '#ff9800',
    [EscrowStatus.PriceRejected]: '#f44336',
    [EscrowStatus.Funded]: '#2196f3',
    [EscrowStatus.InTransit]: '#ff9800',
    [EscrowStatus.Delivered]: '#03a9f4',
    [EscrowStatus.Completed]: '#4caf50',
    [EscrowStatus.Refunded]: '#f44336',
    [EscrowStatus.Disputed]: '#e91e63'
  }
  return colors[status] || '#9e9e9e'
}
