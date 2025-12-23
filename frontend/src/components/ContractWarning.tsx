import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useToast } from '../contexts/ToastContext'
import { ESCROW_CONTRACT_ADDRESS, NETWORK_CONFIG } from '../utils/constants'
import { switchToHardhatNetwork } from '../services/web3Service'

function ContractWarning() {
  const { showToast } = useToast()
  const [isContract, setIsContract] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [networkMismatch, setNetworkMismatch] = useState(false)
  const [currentChainId, setCurrentChainId] = useState<number | null>(null)

  useEffect(() => {
    // Check contract once on mount
    checkContract()
    
    // Only re-check when network changes
    if (window.ethereum) {
      const handleChainChanged = () => {
        checkContract()
      }
      
      window.ethereum.on('chainChanged', handleChainChanged)
      
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('chainChanged', handleChainChanged)
        }
      }
    }
  }, [])

  const checkContract = async () => {
    if (!window.ethereum) {
      setLoading(false)
      return
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)

      // Check network
      const network = await provider.getNetwork()
      setCurrentChainId(Number(network.chainId))
      setNetworkMismatch(Number(network.chainId) !== NETWORK_CONFIG.chainId)

      // Check contract
      const code = await provider.getCode(ESCROW_CONTRACT_ADDRESS)
      setIsContract(code !== '0x' && code.length > 2)
    } catch (error) {
      console.error('Error checking contract:', error)
      setIsContract(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  const handleSwitchNetwork = async () => {
    try {
      await switchToHardhatNetwork()
      // Network will switch, component will re-check automatically
    } catch (error: any) {
      showToast(`Failed to switch network: ${error.message || 'Please switch manually in MetaMask'}`, 'error')
    }
  }

  if (networkMismatch) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold text-yellow-800">
              Wrong Network
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                You're connected to Chain ID: <strong>{currentChainId}</strong>, but you need Chain ID: <strong>{NETWORK_CONFIG.chainId}</strong>
              </p>
              <button
                onClick={handleSwitchNetwork}
                className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Switch to Hardhat Network
              </button>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-yellow-800 font-semibold">
                  Account has 0 ETH? Click here for troubleshooting
                </summary>
                <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 p-3 rounded space-y-2">
                  <p className="font-semibold">Common issues:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      <strong>Wrong Network:</strong> Make sure you're on <strong>Hardhat Local</strong> (Chain ID: 31337)
                      <br />Click "Switch to Hardhat Network" button above
                    </li>
                    <li>
                      <strong>Hardhat Node Not Running:</strong> Start it with:
                      <br /><code className="bg-yellow-200 px-1 rounded">cd smart-contract && npm run node</code>
                    </li>
                    <li>
                      <strong>Wrong Account Selected:</strong> Make sure you selected the imported account in MetaMask
                    </li>
                  </ol>
                  <div className="mt-3 p-2 bg-yellow-200 rounded">
                    <p className="font-semibold">Your imported account:</p>
                    <p className="font-mono text-xs break-all">0x70997970C51812dc3A010C7d01b50e0d17dc79C8</p>
                    <p className="mt-1 text-xs">This account has 10000 ETH on Hardhat network</p>
                  </div>
                </div>
              </details>
              <p className="mt-3 text-xs">
                Or switch manually in MetaMask:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                <li>RPC URL: <code className="bg-yellow-100 px-1 rounded">{NETWORK_CONFIG.rpcUrl}</code></li>
                <li>Chain ID: <code className="bg-yellow-100 px-1 rounded">{NETWORK_CONFIG.chainId}</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isContract) {
    return null
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-red-800">
            Contract Not Found
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              Contract at <code className="bg-red-100 px-1 rounded font-mono text-xs">{ESCROW_CONTRACT_ADDRESS}</code> not found.
            </p>
            <p className="mt-2 font-semibold">Make sure:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Hardhat node is running: <code className="bg-red-100 px-1 rounded">cd smart-contract && npm run node</code></li>
              <li>Contract is deployed: <code className="bg-red-100 px-1 rounded">cd smart-contract && npm run deploy</code></li>
              <li>You're on the correct network (Chain ID: {NETWORK_CONFIG.chainId})</li>
            </ol>
            <p className="mt-3 text-xs text-red-600">
              💡 The contract address is already set correctly. Just make sure Hardhat node is running and contract is deployed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContractWarning

