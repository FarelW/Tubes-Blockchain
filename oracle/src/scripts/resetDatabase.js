import { db, dbRun } from '../database/db.js'
import bcrypt from 'bcryptjs'
import { ethers } from 'ethers'
import config from '../config/contractConfig.js'

async function resetDatabase() {
  try {
    console.log('Starting database reset...')

    // Delete all sessions first (to avoid foreign key constraint issues)
    await dbRun('DELETE FROM sessions')
    console.log('All sessions deleted')

    // Delete all users except default accounts (admin, shipper, logistics)
    await dbRun("DELETE FROM users WHERE username NOT IN ('admin', 'shipper', 'logistics')")
    console.log('All non-default users deleted')

    // Ensure default accounts exist (admin, shipper, logistics)
    const { User } = await import('../models/User.js')
    const defaultPassword = '12345678'
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    const defaultAccounts = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
      },
      {
        username: 'shipper',
        email: 'shipper@example.com',
        password: hashedPassword,
        role: 'shipper',
        walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
      },
      {
        username: 'logistics',
        email: 'logistics@example.com',
        password: hashedPassword,
        role: 'logistics',
        walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
      }
    ]

    for (const account of defaultAccounts) {
      const existingUser = await User.findByUsername(account.username)

      if (!existingUser) {
        // Create user if doesn't exist
        await User.create(account)
        console.log(`${account.role} account created: ${account.username}`)
        console.log(`  Password: ${defaultPassword}`)
        console.log(`  Wallet: ${account.walletAddress}`)
      } else {
        // Update password and wallet if user exists
        await User.updatePassword(existingUser.id, defaultPassword)
        await User.update(existingUser.id, {
          username: account.username,
          email: account.email,
          role: account.role,
          walletAddress: account.walletAddress
        })
        console.log(`${account.role} account reset: ${account.username}`)
        console.log(`  Password: ${defaultPassword}`)
        console.log(`  Wallet: ${account.walletAddress}`)
      }
    }

    // Reset escrow counter in smart contract
    await resetEscrowCounter()

    console.log('Database reset completed successfully!')
    console.log('\nDefault accounts credentials:')
    console.log('1. Admin:')
    console.log('   Username: admin')
    console.log('   Password: 12345678')
    console.log('   Wallet: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8')
    console.log('2. Shipper:')
    console.log('   Username: shipper')
    console.log('   Password: 12345678')
    console.log('   Wallet: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
    console.log('3. Logistics:')
    console.log('   Username: logistics')
    console.log('   Password: 12345678')
    console.log('   Wallet: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC')

    process.exit(0)
  } catch (error) {
    console.error('Error resetting database:', error)
    process.exit(1)
  }
}

async function resetEscrowCounter() {
  try {
    if (!config.ESCROW_CONTRACT_ADDRESS || config.ESCROW_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.log('Contract address not set. Skipping escrow counter reset.')
      return
    }

    if (!config.ORACLE_PRIVATE_KEY) {
      console.log('Oracle private key not set. Skipping escrow counter reset.')
      console.log('Note: To reset escrow counter, you need to deploy a new contract or use owner wallet.')
      return
    }

    console.log('Resetting escrow counter and clearing user escrows in smart contract...')

    const provider = new ethers.JsonRpcProvider(config.RPC_URL)
    const wallet = new ethers.Wallet(config.ORACLE_PRIVATE_KEY, provider)

    // Contract ABI for reset functions
    const contractABI = [
      "function resetEscrowCounter() external",
      "function clearUserEscrows(address _user) external",
      "function owner() view returns (address)",
      "function escrowCounter() view returns (uint256)",
      "function getUserEscrows(address _user) view returns (uint256[])"
    ]

    const contract = new ethers.Contract(
      config.ESCROW_CONTRACT_ADDRESS,
      contractABI,
      wallet
    )

    // Check if wallet is owner
    const owner = await contract.owner()
    if (wallet.address.toLowerCase() !== owner.toLowerCase()) {
      console.log(`Warning: Oracle wallet (${wallet.address}) is not the contract owner (${owner}).`)
      console.log('Escrow counter reset requires owner wallet. Skipping escrow counter reset.')
      console.log('To reset escrow counter, use the owner wallet or deploy a new contract.')
      return
    }

    // Get current escrow counter
    const currentCounter = await contract.escrowCounter()
    console.log(`Current escrow counter: ${currentCounter.toString()}`)

    if (currentCounter.toString() === '0') {
      console.log('Escrow counter is already 0. No reset needed.')
      return
    }

    // Get all users from database to clear their escrows
    const { User } = await import('../models/User.js')
    const allUsers = await User.findAll()

    // Collect unique wallet addresses
    const walletAddresses = new Set()
    allUsers.forEach(user => {
      if (user.wallet_address) {
        walletAddresses.add(user.wallet_address.toLowerCase())
      }
    })

    // Also try to get escrows for common addresses (Hardhat default accounts)
    const commonAddresses = [
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Account 0
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account 1
      '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Account 2
      '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Account 3
      '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', // Account 4
    ]

    // Try to get escrows for common addresses and add to set
    for (const addr of commonAddresses) {
      try {
        const escrows = await contract.getUserEscrows(addr)
        if (escrows && escrows.length > 0) {
          walletAddresses.add(addr.toLowerCase())
          console.log(`Found ${escrows.length} escrows for address ${addr}`)
        }
      } catch (error) {
        // Ignore errors for addresses without escrows
      }
    }

    // Clear user escrows for all found addresses
    console.log(`Clearing user escrows for ${walletAddresses.size} addresses...`)
    for (const addr of walletAddresses) {
      try {
        const escrows = await contract.getUserEscrows(addr)
        if (escrows && escrows.length > 0) {
          const tx = await contract.clearUserEscrows(addr)
          await tx.wait()
          console.log(`Cleared ${escrows.length} escrows for address ${addr.slice(0, 10)}...`)
        }
      } catch (error) {
        console.log(`Warning: Could not clear escrows for ${addr}: ${error.message}`)
      }
    }

    // Reset escrow counter
    console.log('Resetting escrow counter...')
    const tx = await contract.resetEscrowCounter()
    console.log(`Transaction sent: ${tx.hash}`)

    const receipt = await tx.wait()
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`)

    // Verify reset
    const newCounter = await contract.escrowCounter()
    console.log(`Escrow counter reset to: ${newCounter.toString()}`)
    console.log('Escrow counter and user escrows reset completed successfully!')
    console.log('Note: Escrow data still exists in contract storage but is no longer accessible via getUserEscrows()')
  } catch (error) {
    console.error('Error resetting escrow counter:', error.message)
    console.log('Note: Escrow counter reset requires contract owner wallet.')
    console.log('If you are not the owner, you may need to deploy a new contract.')
  }
}

resetDatabase()

