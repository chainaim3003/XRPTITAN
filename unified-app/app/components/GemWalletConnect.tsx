'use client'

import { useState, useEffect } from 'react'

interface GemWalletState {
  isInstalled: boolean
  isConnected: boolean
  address: string | null
  network: string | null
}

export default function GemWalletConnect() {
  const [wallet, setWallet] = useState<GemWalletState>({
    isInstalled: false,
    isConnected: false,
    address: null,
    network: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if GemWallet is installed
  useEffect(() => {
    checkGemWallet()
  }, [])

  const checkGemWallet = async () => {
    try {
      const gemWallet = await import('@gemwallet/api')
      const response = await gemWallet.isInstalled()
      
      setWallet(prev => ({
        ...prev,
        isInstalled: response.result.isInstalled
      }))
    } catch (err) {
      console.log('GemWallet not detected')
    }
  }

  // Connect to GemWallet
  const connectWallet = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const gemWallet = await import('@gemwallet/api')
      
      // Check if installed
      const installed = await gemWallet.isInstalled()
      if (!installed.result.isInstalled) {
        setError('GemWallet is not installed. Please install it from gemwallet.app')
        setIsLoading(false)
        return
      }

      // Get address
      const addressResponse = await gemWallet.getAddress()
      
      if (addressResponse.type === 'response' && addressResponse.result?.address) {
        // Get network
        const networkResponse = await gemWallet.getNetwork()
        
        setWallet({
          isInstalled: true,
          isConnected: true,
          address: addressResponse.result.address,
          network: networkResponse.type === 'response' ? networkResponse.result?.network || 'Unknown' : 'Unknown',
        })
      } else {
        setError('Failed to get wallet address. Please unlock GemWallet and try again.')
      }
    } catch (err) {
      setError(`Connection failed: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Disconnect
  const disconnectWallet = () => {
    setWallet({
      isInstalled: true,
      isConnected: false,
      address: null,
      network: null,
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>👛</span> GemWallet Connection
      </h2>

      {/* Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${wallet.isInstalled ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {wallet.isInstalled ? 'GemWallet Detected' : 'GemWallet Not Detected'}
          </span>
        </div>
        {wallet.isConnected && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-600">Connected to {wallet.network}</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Wallet Info */}
      {wallet.isConnected && wallet.address && (
        <div className="mb-4 space-y-3">
          <div className="p-3 bg-indigo-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Connected Address</p>
            <p className="text-sm font-mono text-indigo-700 break-all">{wallet.address}</p>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Network</p>
            <p className="text-sm font-medium text-green-700">{wallet.network}</p>
          </div>

          <a
            href={`https://testnet.xrpl.org/accounts/${wallet.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm transition-colors"
          >
            View on Explorer →
          </a>
        </div>
      )}

      {/* Buttons */}
      {!wallet.isConnected ? (
        <button
          onClick={connectWallet}
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Connecting...' : 'Connect GemWallet'}
        </button>
      ) : (
        <button
          onClick={disconnectWallet}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
        >
          Disconnect
        </button>
      )}

      {/* Install Link */}
      {!wallet.isInstalled && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            Don't have GemWallet?{' '}
            <a 
              href="https://gemwallet.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Install it here →
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
