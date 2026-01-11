'use client'

import { useState, useEffect } from 'react'
import { useXRPL } from '../lib/xrpl-context'

export default function XRPTestPage() {
  const {
    isConnected,
    isConnecting,
    networkName,
    buyerWallet,
    sellerWallet,
    platformWallet,
    setBuyerWallet,
    setSellerWallet,
    setPlatformWallet,
    createWallet,
    loadWallet,
    getBalance,
    sendPayment,
    isLoading,
    lastError,
    lastTransaction,
  } = useXRPL()

  const [status, setStatus] = useState('Connecting to XRP Ledger...')
  const [seedInput, setSeedInput] = useState('')
  const [walletType, setWalletType] = useState<'buyer' | 'seller' | 'platform'>('buyer')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [sendFromWallet, setSendFromWallet] = useState<'buyer' | 'seller' | 'platform'>('buyer')

  useEffect(() => {
    if (isConnected) {
      setStatus(`✅ Connected to XRP Ledger ${networkName}`)
    } else if (isConnecting) {
      setStatus('🔄 Connecting to XRP Ledger...')
    }
  }, [isConnected, isConnecting, networkName])

  // Create and fund new wallet
  const handleCreateWallet = async () => {
    setStatus(`🔄 Creating ${walletType} wallet...`)
    try {
      const wallet = await createWallet()
      
      if (walletType === 'buyer') setBuyerWallet(wallet)
      else if (walletType === 'seller') setSellerWallet(wallet)
      else setPlatformWallet(wallet)
      
      setStatus(`✅ ${walletType} wallet created! Address: ${wallet.address}`)
    } catch (error) {
      setStatus(`❌ Failed: ${error}`)
    }
  }

  // Load wallet from seed
  const handleLoadWallet = async () => {
    if (!seedInput.trim()) {
      setStatus('❌ Please enter a seed')
      return
    }
    
    setStatus(`🔄 Loading ${walletType} wallet...`)
    try {
      const wallet = await loadWallet(seedInput.trim())
      
      if (walletType === 'buyer') setBuyerWallet(wallet)
      else if (walletType === 'seller') setSellerWallet(wallet)
      else setPlatformWallet(wallet)
      
      setStatus(`✅ ${walletType} wallet loaded!`)
      setSeedInput('')
    } catch (error) {
      setStatus(`❌ Invalid seed: ${error}`)
    }
  }

  // Refresh balance
  const refreshBalance = async (type: 'buyer' | 'seller' | 'platform') => {
    const wallet = type === 'buyer' ? buyerWallet : type === 'seller' ? sellerWallet : platformWallet
    const setWallet = type === 'buyer' ? setBuyerWallet : type === 'seller' ? setSellerWallet : setPlatformWallet
    
    if (!wallet) return
    
    try {
      const balance = await getBalance(wallet.address)
      setWallet({ ...wallet, balance })
      setStatus(`✅ ${type} balance refreshed`)
    } catch (error) {
      setStatus(`❌ Failed to refresh: ${error}`)
    }
  }

  // Send payment
  const handleSendPayment = async () => {
    const fromWallet = sendFromWallet === 'buyer' ? buyerWallet : 
                       sendFromWallet === 'seller' ? sellerWallet : platformWallet
    
    if (!fromWallet) {
      setStatus(`❌ ${sendFromWallet} wallet not loaded`)
      return
    }
    
    if (!destinationAddress || !sendAmount) {
      setStatus('❌ Enter destination and amount')
      return
    }
    
    setStatus('🔄 Sending payment...')
    try {
      const result = await sendPayment(fromWallet.seed, destinationAddress, sendAmount, memo)
      setStatus(`✅ Payment sent! Hash: ${result.hash.slice(0, 16)}...`)
      
      // Refresh balance
      await refreshBalance(sendFromWallet)
      
      setDestinationAddress('')
      setSendAmount('')
      setMemo('')
    } catch (error) {
      setStatus(`❌ Failed: ${error}`)
    }
  }

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setStatus(`📋 ${label} copied!`)
  }

  // Wallet card component
  const WalletCard = ({ 
    type, 
    wallet, 
    color 
  }: { 
    type: 'buyer' | 'seller' | 'platform'
    wallet: typeof buyerWallet
    color: string 
  }) => (
    <div className={`bg-white rounded-xl shadow-lg p-6 border-2 ${color}`}>
      <h3 className="text-lg font-bold text-gray-900 mb-4 capitalize">{type} Wallet</h3>
      
      {wallet ? (
        <div className="space-y-3">
          <div className={`p-4 rounded-lg ${
            type === 'buyer' ? 'bg-blue-50' : 
            type === 'seller' ? 'bg-green-50' : 'bg-purple-50'
          }`}>
            <p className="text-sm text-gray-500">Balance</p>
            <p className="text-2xl font-bold">{wallet.balance} XRP</p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs text-gray-500">Address</p>
              <button 
                onClick={() => copyToClipboard(wallet.address, 'Address')}
                className="text-xs text-indigo-600"
              >
                📋 Copy
              </button>
            </div>
            <p className="text-xs font-mono break-all">{wallet.address}</p>
          </div>
          
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs text-yellow-700 font-medium">⚠️ Seed</p>
              <button 
                onClick={() => copyToClipboard(wallet.seed, 'Seed')}
                className="text-xs text-yellow-700"
              >
                📋 Copy
              </button>
            </div>
            <p className="text-xs font-mono break-all text-yellow-800">{wallet.seed}</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => refreshBalance(type)}
              disabled={isLoading}
              className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg text-sm"
            >
              🔄 Refresh
            </button>
            <a
              href={`https://testnet.xrpl.org/accounts/${wallet.address}`}
              target="_blank"
              className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-2 rounded-lg text-sm text-center"
            >
              🔍 Explorer
            </a>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">👛</p>
          <p className="text-sm">Not created yet</p>
          <p className="text-xs mt-1">Select "{type}" above and create</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full mb-4">
            <span className="text-2xl">💎</span>
            <span className="text-indigo-700 font-medium">XRP Ledger {networkName}</span>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">XRP Wallet Manager</h1>
          <p className="text-gray-600">Create wallets for Buyer, Seller, and Platform - used across all pages</p>
        </div>

        {/* Status */}
        <div className={`mb-8 p-4 rounded-xl border-2 ${
          status.includes('✅') ? 'bg-green-50 border-green-200' :
          status.includes('❌') ? 'bg-red-50 border-red-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <p className="font-medium">{status}</p>
        </div>

        {/* Wallet Creation Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Create or Load Wallet</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Wallet Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Select Wallet Type</label>
              <div className="flex gap-2">
                {(['buyer', 'seller', 'platform'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setWalletType(type)}
                    className={`flex-1 py-3 rounded-lg font-medium capitalize ${
                      walletType === type
                        ? type === 'buyer' ? 'bg-blue-600 text-white' :
                          type === 'seller' ? 'bg-green-600 text-white' :
                          'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              
              <button
                onClick={handleCreateWallet}
                disabled={isLoading || !isConnected}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
              >
                {isLoading ? '🔄 Creating...' : `🚀 Create & Fund ${walletType} Wallet`}
              </button>
            </div>

            {/* Load from Seed */}
            <div>
              <label className="block text-sm font-medium mb-2">Or Load from Seed</label>
              <input
                type="password"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="sXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full px-4 py-3 border rounded-lg font-mono text-sm mb-4"
              />
              <button
                onClick={handleLoadWallet}
                disabled={isLoading || !isConnected || !seedInput}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
              >
                Load {walletType} Wallet from Seed
              </button>
            </div>
          </div>
        </div>

        {/* Wallet Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <WalletCard type="buyer" wallet={buyerWallet} color="border-blue-300" />
          <WalletCard type="seller" wallet={sellerWallet} color="border-green-300" />
          <WalletCard type="platform" wallet={platformWallet} color="border-purple-300" />
        </div>

        {/* Send Payment Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📤 Send XRP Payment</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Send From</label>
                <div className="flex gap-2">
                  {(['buyer', 'seller', 'platform'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSendFromWallet(type)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize ${
                        sendFromWallet === type
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Destination Address</label>
                <input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Amount (XRP)</label>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="10"
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Memo (Optional)</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Payment for Invoice #123"
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSendPayment}
            disabled={isLoading || !destinationAddress || !sendAmount}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-medium text-lg disabled:opacity-50"
          >
            {isLoading ? '🔄 Sending...' : '🚀 Send XRP'}
          </button>
        </div>

        {/* Last Transaction */}
        {lastTransaction && (
          <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
            <h3 className="text-lg font-bold text-green-800 mb-4">✅ Last Transaction</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-600">Status:</span> <span className="font-medium text-green-700">{lastTransaction.status}</span></p>
              <p><span className="text-gray-600">Fee:</span> {lastTransaction.fee} XRP</p>
              <p className="break-all"><span className="text-gray-600">Hash:</span> <span className="font-mono text-xs">{lastTransaction.hash}</span></p>
              <a
                href={lastTransaction.explorerUrl}
                target="_blank"
                className="inline-block mt-2 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                🔍 View on XRPL Explorer →
              </a>
            </div>
          </div>
        )}

        {/* Environment Setup */}
        <div className="mt-8 bg-gray-900 rounded-xl p-6 text-green-400 font-mono text-sm">
          <h3 className="text-white font-bold mb-4">📋 Copy to .env file:</h3>
          <pre className="overflow-x-auto">
{`# Buyer Wallet
NEXT_PUBLIC_BUYER_WALLET_SEED=${buyerWallet?.seed || 'sXXX...'}
NEXT_PUBLIC_BUYER_WALLET_ADDRESS=${buyerWallet?.address || 'rXXX...'}

# Seller Wallet
NEXT_PUBLIC_SELLER_WALLET_SEED=${sellerWallet?.seed || 'sXXX...'}
NEXT_PUBLIC_SELLER_WALLET_ADDRESS=${sellerWallet?.address || 'rXXX...'}

# Platform Wallet
NEXT_PUBLIC_PLATFORM_WALLET_SEED=${platformWallet?.seed || 'sXXX...'}
NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS=${platformWallet?.address || 'rXXX...'}`}
          </pre>
        </div>

        {/* Features */}
        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-xl font-bold mb-4">💎 These wallets are used across all pages:</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="font-medium">AgenticFlow</p>
              <p className="text-sm text-indigo-200">Buyer ↔ Seller payments</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="font-medium">AgentExchange</p>
              <p className="text-sm text-indigo-200">Agent trading</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="font-medium">All Trade Pages</p>
              <p className="text-sm text-indigo-200">Exporter, Importer, etc.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
