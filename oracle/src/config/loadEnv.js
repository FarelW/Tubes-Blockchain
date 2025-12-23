/**
 * Load environment variables
 * This file must be imported FIRST before any other modules that use process.env
 */
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get current directory (ES modules)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from oracle/.env
// __dirname is oracle/src/config, so we go up two levels to oracle/
const envPath = join(__dirname, '..', '..', '.env')
const result = dotenv.config({ path: envPath })

// Log environment variables status (without exposing sensitive data)
if (result.error) {
  console.error('Error loading .env file:', result.error)
} else {
  console.log('Loading environment variables from:', envPath)
  console.log('ORACLE_PRIVATE_KEY:', process.env.ORACLE_PRIVATE_KEY ? '***SET***' : 'NOT SET')
  console.log('ESCROW_CONTRACT_ADDRESS:', process.env.ESCROW_CONTRACT_ADDRESS || 'NOT SET')
}

export default result

