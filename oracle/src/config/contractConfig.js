/**
 * Contract configuration
 * Update ESCROW_CONTRACT_ADDRESS after deploying the smart contract
 */

// Import loadEnv to ensure environment variables are loaded before reading process.env
import './loadEnv.js'

const ESCROW_CONTRACT_ABI = [
  // Events
  "event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount, string destinationGPS, uint256 deadline)",
  "event EscrowFunded(uint256 indexed escrowId, uint256 amount)",
  "event EscrowApproved(uint256 indexed escrowId, address indexed seller)",
  "event DeliveryStarted(uint256 indexed escrowId, uint256 timestamp)",
  "event DeliveryMarked(uint256 indexed escrowId, address indexed seller)",
  "event VerificationRequested(uint256 indexed escrowId, address indexed requester)",
  "event DeliveryVerified(uint256 indexed escrowId, bool gpsMatched, bool temperatureValid, bool verified)",
  "event FundsReleased(uint256 indexed escrowId, address indexed recipient, uint256 amount)",
  "event EscrowRefunded(uint256 indexed escrowId, address indexed buyer, uint256 amount)",

  // Read functions
  "function getEscrow(uint256 escrowId) view returns (tuple(uint256 id, address buyer, address seller, uint256 amount, string destinationGPS, int256 minTemperature, int256 maxTemperature, uint256 deadline, uint8 status, bool verified, uint256 createdAt, uint256 verifiedAt))",
  "function getVerification(uint256 escrowId) view returns (tuple(string currentGPS, int256 temperature, uint256 timestamp, bool gpsMatched, bool temperatureValid))",
  "function getUserEscrows(address user) view returns (uint256[])",
  "function getEscrowStatus(uint256 escrowId) view returns (uint8)",
  "function isEscrowActive(uint256 escrowId) view returns (bool)",
  "function escrowCounter() view returns (uint256)",
  "function oracle() view returns (address)",

  // Write functions
  "function approveEscrow(uint256 escrowId)",
  "function startDelivery(uint256 escrowId)",
  "function markDelivered(uint256 escrowId)",
  "function verifyDelivery(uint256 escrowId, string memory currentGPS, int256 temperature, bool gpsMatched, bool temperatureValid)",
  "function resetEscrowCounter() external",
  "function clearUserEscrows(address _user) external",
  "function adminUpdateStatus(uint256 _escrowId, uint8 _newStatus) external",
  "function owner() view returns (address)",
  // Events
  "event StatusUpdated(uint256 indexed escrowId, uint8 oldStatus, uint8 newStatus)"
]

export default {
  // Update this after deploying the smart contract
  ESCROW_CONTRACT_ADDRESS: process.env.ESCROW_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  ESCROW_CONTRACT_ABI,

  // Network configuration
  RPC_URL: process.env.RPC_URL || 'http://127.0.0.1:8545',
  CHAIN_ID: parseInt(process.env.CHAIN_ID || '31337'),

  // Oracle private key (for signing transactions)
  ORACLE_PRIVATE_KEY: process.env.ORACLE_PRIVATE_KEY || '',

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000, // 5 seconds
}
