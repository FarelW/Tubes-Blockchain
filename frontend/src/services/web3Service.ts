import { ethers } from 'ethers'

let provider: ethers.BrowserProvider | null = null
let signer: ethers.JsonRpcSigner | null = null

export const getProvider = (): ethers.BrowserProvider | null => {
  if (typeof window !== 'undefined' && window.ethereum) {
    if (!provider) {
      provider = new ethers.BrowserProvider(window.ethereum)
    }
    return provider
  }
  return null
}

export const getSigner = async (): Promise<ethers.JsonRpcSigner | null> => {
  const provider = getProvider()
  if (!provider) {
    throw new Error('MetaMask is not installed')
  }

  try {
    signer = await provider.getSigner()
    return signer
  } catch (error) {
    console.error('Error getting signer:', error)
    throw error
  }
}

export const getAccount = async (): Promise<string | null> => {
  try {
    const signer = await getSigner()
    if (signer) {
      return await signer.getAddress()
    }
    return null
  } catch (error) {
    console.error('Error getting account:', error)
    return null
  }
}

export const connectWallet = async (): Promise<string> => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed')
  }

  try {
    const provider = getProvider()
    if (!provider) {
      throw new Error('Provider not available')
    }

    await provider.send('eth_requestAccounts', [])
    const signer = await provider.getSigner()
    const address = await signer.getAddress()
    return address
  } catch (error) {
    console.error('Error connecting wallet:', error)
    throw error
  }
}

export const getNetwork = async (): Promise<ethers.Network | null> => {
  try {
    const provider = getProvider()
    if (provider) {
      return await provider.getNetwork()
    }
    return null
  } catch (error) {
    console.error('Error getting network:', error)
    return null
  }
}

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const formatEther = (value: bigint): string => {
  return ethers.formatEther(value)
}

export const parseEther = (value: string): bigint => {
  return ethers.parseEther(value)
}

export const addHardhatNetwork = async (): Promise<boolean> => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x7A69', // 31337 in hex
        chainName: 'Hardhat Local',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        },
        rpcUrls: ['http://127.0.0.1:8545'],
        blockExplorerUrls: []
      }]
    })
    return true
  } catch (error: any) {
    if (error.code === 4902) {
      return true
    }
    console.error('Error adding network:', error)
    throw error
  }
}

export const switchToHardhatNetwork = async (): Promise<boolean> => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x7A69' }] // 31337 in hex
    })
    return true
  } catch (error: any) {
    if (error.code === 4902) {
      return await addHardhatNetwork()
    }
    console.error('Error switching network:', error)
    throw error
  }
}

