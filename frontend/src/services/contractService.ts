import { ethers } from 'ethers'
import { getProvider, getSigner } from './web3Service'
import { ESCROW_CONTRACT_ABI, ESCROW_CONTRACT_ADDRESS, EscrowStatus, NETWORK_CONFIG } from '../utils/constants'

export interface EscrowData {
  id: bigint
  buyer: string
  seller: string
  amount: bigint
  destinationGPS: string
  minTemperature: bigint
  maxTemperature: bigint
  deadline: bigint
  status: EscrowStatus
  verified: boolean
  createdAt: bigint
  verifiedAt: bigint
}

export interface VerificationData {
  currentGPS: string
  temperature: bigint
  timestamp: bigint
  gpsMatched: boolean
  temperatureValid: boolean
}

export const getEscrowContract = async (readonly: boolean = false): Promise<ethers.Contract | null> => {
  try {
    if (readonly) {
      // For read-only operations, try MetaMask provider first, fallback to JSON-RPC
      let provider: ethers.Provider | null = getProvider()
      
      // If MetaMask provider is not available (e.g., in incognito mode), use JSON-RPC provider
      if (!provider) {
        provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl)
      }
      
      if (!provider) {
        throw new Error('Provider not available')
      }
      
      // Check if contract exists
      const code = await provider.getCode(ESCROW_CONTRACT_ADDRESS)
      if (code === '0x') {
        throw new Error(`Contract not deployed at address ${ESCROW_CONTRACT_ADDRESS}. Please deploy the contract first.`)
      }
      
      return new ethers.Contract(
        ESCROW_CONTRACT_ADDRESS,
        ESCROW_CONTRACT_ABI,
        provider
      )
    }

    const signer = await getSigner()
    if (!signer) {
      throw new Error('Signer not available')
    }

    // Check if contract exists
    const provider = getProvider()
    if (provider) {
      const code = await provider.getCode(ESCROW_CONTRACT_ADDRESS)
      if (code === '0x') {
        throw new Error(`Contract not deployed at address ${ESCROW_CONTRACT_ADDRESS}. Please deploy the contract first.`)
      }
    }

    return new ethers.Contract(
      ESCROW_CONTRACT_ADDRESS,
      ESCROW_CONTRACT_ABI,
      signer
    )
  } catch (error) {
    console.error('Error getting escrow contract:', error)
    throw error
  }
}

export const createEscrow = async (
  sellerAddress: string,
  destinationGPS: string,
  minTemperature: number,
  maxTemperature: number,
  deadlineDays: number
): Promise<string> => {
  try {
    const contract = await getEscrowContract()
    if (!contract) {
      throw new Error('Contract not available')
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineDays * 24 * 60 * 60)
    
    // Convert temperature to Celsius * 100
    const minTemp = BigInt(Math.round(minTemperature * 100))
    const maxTemp = BigInt(Math.round(maxTemperature * 100))

    console.log('Creating escrow request with params:', {
      seller: sellerAddress,
      destinationGPS,
      minTemp: minTemp.toString(),
      maxTemp: maxTemp.toString(),
      deadline: deadline.toString()
    })

    // No payment needed - just create request
    const tx = await contract.createEscrow(
      sellerAddress,
      destinationGPS,
      minTemp,
      maxTemp,
      deadline
    )

    console.log('Transaction sent:', tx.hash)
    const receipt = await tx.wait()
    console.log('Transaction confirmed:', receipt)

    return receipt.hash
  } catch (error) {
    console.error('Error creating escrow:', error)
    throw error
  }
}

export const setPriceAndApprove = async (
  escrowId: string | number,
  amount: string
): Promise<string> => {
  try {
    const contract = await getEscrowContract()
    if (!contract) {
      throw new Error('Contract not available')
    }

    const amountWei = ethers.parseEther(amount)

    const tx = await contract.setPriceAndApprove(escrowId, amountWei)
    const receipt = await tx.wait()
    return receipt.hash
  } catch (error) {
    console.error('Error setting price and approving:', error)
    throw error
  }
}

export const rejectPrice = async (escrowId: string | number): Promise<string> => {
  try {
    const contract = await getEscrowContract()
    if (!contract) {
      throw new Error('Contract not available')
    }

    const tx = await contract.rejectPrice(escrowId)
    const receipt = await tx.wait()
    return receipt.hash
  } catch (error) {
    console.error('Error rejecting price:', error)
    throw error
  }
}

export const fundEscrow = async (
  escrowId: string | number,
  amount: string
): Promise<string> => {
  try {
    const contract = await getEscrowContract()
    if (!contract) {
      throw new Error('Contract not available')
    }

    const amountWei = ethers.parseEther(amount)

    const tx = await contract.fundEscrow(escrowId, { value: amountWei })
    const receipt = await tx.wait()
    return receipt.hash
  } catch (error) {
    console.error('Error funding escrow:', error)
    throw error
  }
}

export const getEscrow = async (escrowId: string | number): Promise<EscrowData | null> => {
  try {
    const contract = await getEscrowContract(true)
    if (!contract) {
      throw new Error('Contract not available')
    }

    const escrow = await contract.getEscrow(escrowId)
    return {
      id: escrow.id,
      buyer: escrow.buyer,
      seller: escrow.seller,
      amount: escrow.amount,
      destinationGPS: escrow.destinationGPS,
      minTemperature: escrow.minTemperature,
      maxTemperature: escrow.maxTemperature,
      deadline: escrow.deadline,
      status: Number(escrow.status) as EscrowStatus,
      verified: escrow.verified,
      createdAt: escrow.createdAt,
      verifiedAt: escrow.verifiedAt
    }
  } catch (error) {
    console.error('Error getting escrow:', error)
    return null
  }
}

export const getVerification = async (escrowId: string | number): Promise<VerificationData | null> => {
  try {
    const contract = await getEscrowContract(true)
    if (!contract) {
      throw new Error('Contract not available')
    }

    const verification = await contract.getVerification(escrowId)
    return {
      currentGPS: verification.currentGPS,
      temperature: verification.temperature,
      timestamp: verification.timestamp,
      gpsMatched: verification.gpsMatched,
      temperatureValid: verification.temperatureValid
    }
  } catch (error) {
    console.error('Error getting verification:', error)
    return null
  }
}

export const approveEscrow = async (escrowId: string | number): Promise<string> => {
  try {
    const contract = await getEscrowContract()
    if (!contract) {
      throw new Error('Contract not available')
    }

    const tx = await contract.approveEscrow(escrowId)
    const receipt = await tx.wait()
    return receipt.hash
  } catch (error) {
    console.error('Error approving escrow:', error)
    throw error
  }
}

export const startDelivery = async (escrowId: string | number): Promise<string> => {
  try {
    const contract = await getEscrowContract()
    if (!contract) {
      throw new Error('Contract not available')
    }

    const tx = await contract.startDelivery(escrowId)
    const receipt = await tx.wait()
    return receipt.hash
  } catch (error) {
    console.error('Error starting delivery:', error)
    throw error
  }
}

export const markDelivered = async (escrowId: string | number): Promise<string> => {
  try {
    const contract = await getEscrowContract()
    if (!contract) {
      throw new Error('Contract not available')
    }

    const tx = await contract.markDelivered(escrowId)
    const receipt = await tx.wait()
    return receipt.hash
  } catch (error) {
    console.error('Error marking delivered:', error)
    throw error
  }
}

export const requestVerification = async (escrowId: string | number): Promise<string> => {
  try {
    const contract = await getEscrowContract()
    if (!contract) {
      throw new Error('Contract not available')
    }

    const tx = await contract.requestVerification(escrowId)
    const receipt = await tx.wait()
    return receipt.hash
  } catch (error) {
    console.error('Error requesting verification:', error)
    throw error
  }
}

export const refund = async (escrowId: string | number): Promise<string> => {
  try {
    const contract = await getEscrowContract()
    if (!contract) {
      throw new Error('Contract not available')
    }

    const tx = await contract.refund(escrowId)
    const receipt = await tx.wait()
    return receipt.hash
  } catch (error) {
    console.error('Error refunding:', error)
    throw error
  }
}

export const getUserEscrows = async (userAddress: string): Promise<bigint[]> => {
  try {
    const contract = await getEscrowContract(true)
    if (!contract) {
      throw new Error('Contract not available')
    }

    const escrows = await contract.getUserEscrows(userAddress)
    return escrows
  } catch (error) {
    console.error('Error getting user escrows:', error)
    return []
  }
}

export const getEscrowCount = async (): Promise<bigint> => {
  try {
    const contract = await getEscrowContract(true)
    if (!contract) {
      throw new Error('Contract not available')
    }

    return await contract.escrowCounter()
  } catch (error) {
    console.error('Error getting escrow count:', error)
    return BigInt(0)
  }
}

export const isEscrowActive = async (escrowId: string | number): Promise<boolean> => {
  try {
    const contract = await getEscrowContract(true)
    if (!contract) {
      throw new Error('Contract not available')
    }

    return await contract.isEscrowActive(escrowId)
  } catch (error) {
    console.error('Error checking escrow status:', error)
    return false
  }
}
