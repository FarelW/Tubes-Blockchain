import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '..', '..', '.env')
const result = dotenv.config({ path: envPath })

if (result.error) {
  console.error('Error loading .env file:', result.error)
} else {
  console.log('Loading environment variables from:', envPath)
  console.log('ORACLE_PRIVATE_KEY:', process.env.ORACLE_PRIVATE_KEY ? '***SET***' : 'NOT SET')
  console.log('ESCROW_CONTRACT_ADDRESS:', process.env.ESCROW_CONTRACT_ADDRESS || 'NOT SET')
}

export default result

