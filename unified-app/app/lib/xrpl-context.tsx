'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// ============================================
// TYPES
// ============================================
export interface XRPWallet {
  address: string
  seed: string
  balance: string
}

export interface XRPTransactionResult {
  hash: string
  status: string
  fee: string
  explorerUrl: string
  ledgerIndex?: number
}

export interface XRPLContextType {
  // Connection
  client: any | null
  isConnected: boolean
  isConnecting: boolean
  networkName: string
  
  // Wallets
  buyerWallet: XRPWallet | null
  sellerWallet: XRPWallet | null
  platformWallet: XRPWallet | null
  
  // Loading states
  isLoading: boolean
  
  // Methods
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  createWallet: () => Promise<XRPWallet>
  loadWallet: (seed: string) => Promise<XRPWallet>
  getBalance: (address: string) => Promise<string>
  sendPayment: (
    fromSeed: string,
    toAddress: string,
    amount: string,
    memo?: string
  ) => Promise<XRPTransactionResult>
  sendAtomicPayment: (
    fromSeed: string,
    toSellerAddress: string,
    toPlatformAddress: string,
    sellerAmount: string,
    platformFee: string,
    memo?: string
  ) => Promise<XRPTransactionResult>
  
  // Wallet setters
  setBuyerWallet: (wallet: XRPWallet | null) => void
  setSellerWallet: (wallet: XRPWallet | null) => void
  setPlatformWallet: (wallet: XRPWallet | null) => void
  
  // Status
  lastError: string | null
  lastTransaction: XRPTransactionResult | null
}

// ============================================
// CONFIGURATION
// ============================================
const XRPL_TESTNET_SERVER = 'wss://s.altnet.rippletest.net:51233'
const XRPL_MAINNET_SERVER = 'wss://s1.ripple.com'
const XRPL_EXPLORER_TESTNET = 'https://testnet.xrpl.org'
const XRPL_EXPLORER_MAINNET = 'https://xrpscan.com'

// Use testnet by default
const NETWORK = process.env.NEXT_PUBLIC_XRPL_NETWORK || 'testnet'
const SERVER_URL = NETWORK === 'mainnet' ? XRPL_MAINNET_SERVER : XRPL_TESTNET_SERVER
const EXPLORER_URL = NETWORK === 'mainnet' ? XRPL_EXPLORER_MAINNET : XRPL_EXPLORER_TESTNET

// ============================================
// CONTEXT
// ============================================
const XRPLContext = createContext<XRPLContextType | null>(null)

// ============================================
// PROVIDER
// ============================================
export function XRPLWalletProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastTransaction, setLastTransaction] = useState<XRPTransactionResult | null>(null)
  
  // Wallets
  const [buyerWallet, setBuyerWallet] = useState<XRPWallet | null>(null)
  const [sellerWallet, setSellerWallet] = useState<XRPWallet | null>(null)
  const [platformWallet, setPlatformWallet] = useState<XRPWallet | null>(null)

  // Prevent MetaMask/Ethereum wallet interference
  useEffect(() => {
    // Tell MetaMask we don't need it
    if (typeof window !== 'undefined') {
      // Remove ethereum provider detection to prevent MetaMask popup
      const originalEthereum = (window as any).ethereum
      if (originalEthereum) {
        console.log('⚠️ MetaMask detected - This app uses XRP Ledger, not Ethereum')
      }
    }
  }, [])

  // Connect to XRPL
  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return
    
    setIsConnecting(true)
    setLastError(null)
    
    try {
      const xrpl = await import('xrpl')
      const newClient = new xrpl.Client(SERVER_URL)
      
      await newClient.connect()
      setClient(newClient)
      setIsConnected(true)
      
      console.log(`✅ Connected to XRP Ledger ${NETWORK}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed'
      setLastError(message)
      console.error('❌ XRPL connection error:', error)
    } finally {
      setIsConnecting(false)
    }
  }, [isConnected, isConnecting])

  // Disconnect
  const disconnect = useCallback(async () => {
    if (client) {
      await client.disconnect()
      setClient(null)
      setIsConnected(false)
    }
  }, [client])

  // Create new funded wallet (testnet only)
  const createWallet = useCallback(async (): Promise<XRPWallet> => {
    if (!client || !isConnected) {
      throw new Error('Not connected to XRPL')
    }
    
    setIsLoading(true)
    try {
      const fundResult = await client.fundWallet()
      
      const wallet: XRPWallet = {
        address: fundResult.wallet.address,
        seed: fundResult.wallet.seed!,
        balance: fundResult.balance.toString(),
      }
      
      console.log(`✅ Wallet created: ${wallet.address}`)
      return wallet
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create wallet'
      setLastError(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [client, isConnected])

  // Load wallet from seed
  const loadWallet = useCallback(async (seed: string): Promise<XRPWallet> => {
    if (!client || !isConnected) {
      throw new Error('Not connected to XRPL')
    }
    
    setIsLoading(true)
    try {
      const xrpl = await import('xrpl')
      const xrplWallet = xrpl.Wallet.fromSeed(seed)
      
      let balance = '0'
      try {
        balance = await client.getXrpBalance(xrplWallet.address)
      } catch {
        balance = '0'
      }
      
      const wallet: XRPWallet = {
        address: xrplWallet.address,
        seed: seed,
        balance,
      }
      
      console.log(`✅ Wallet loaded: ${wallet.address}`)
      return wallet
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load wallet'
      setLastError(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [client, isConnected])

  // Get balance
  const getBalance = useCallback(async (address: string): Promise<string> => {
    if (!client || !isConnected) {
      throw new Error('Not connected to XRPL')
    }
    
    try {
      const balance = await client.getXrpBalance(address)
      return balance
    } catch {
      return '0'
    }
  }, [client, isConnected])

  // Send payment
  const sendPayment = useCallback(async (
    fromSeed: string,
    toAddress: string,
    amount: string,
    memo?: string
  ): Promise<XRPTransactionResult> => {
    if (!client || !isConnected) {
      throw new Error('Not connected to XRPL')
    }
    
    setIsLoading(true)
    try {
      const xrpl = await import('xrpl')
      const wallet = xrpl.Wallet.fromSeed(fromSeed)
      
      const payment: any = {
        TransactionType: 'Payment',
        Account: wallet.address,
        Destination: toAddress,
        Amount: xrpl.xrpToDrops(amount),
      }
      
      if (memo) {
        payment.Memos = [{
          Memo: {
            MemoType: Buffer.from('text/plain', 'utf8').toString('hex').toUpperCase(),
            MemoData: Buffer.from(memo, 'utf8').toString('hex').toUpperCase(),
          },
        }]
      }
      
      const prepared = await client.autofill(payment)
      const signed = wallet.sign(prepared)
      const result = await client.submitAndWait(signed.tx_blob)
      
      const txResult: XRPTransactionResult = {
        hash: result.result.hash,
        status: (result.result.meta as any)?.TransactionResult || 'unknown',
        fee: xrpl.dropsToXrp(prepared.Fee || '0'),
        explorerUrl: `${EXPLORER_URL}/transactions/${result.result.hash}`,
        ledgerIndex: result.result.ledger_index,
      }
      
      setLastTransaction(txResult)
      console.log(`✅ Payment sent: ${txResult.hash}`)
      
      return txResult
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaction failed'
      setLastError(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [client, isConnected])

  // Send atomic payment (to seller + platform fee)
  const sendAtomicPayment = useCallback(async (
    fromSeed: string,
    toSellerAddress: string,
    toPlatformAddress: string,
    sellerAmount: string,
    platformFee: string,
    memo?: string
  ): Promise<XRPTransactionResult> => {
    if (!client || !isConnected) {
      throw new Error('Not connected to XRPL')
    }
    
    setIsLoading(true)
    console.log(`💰 Executing XRP atomic payment:`)
    console.log(`   Seller: ${sellerAmount} XRP → ${toSellerAddress}`)
    console.log(`   Platform: ${platformFee} XRP → ${toPlatformAddress}`)
    
    try {
      const xrpl = await import('xrpl')
      const wallet = xrpl.Wallet.fromSeed(fromSeed)
      
      // Payment 1: To Seller
      const payment1: any = {
        TransactionType: 'Payment',
        Account: wallet.address,
        Destination: toSellerAddress,
        Amount: xrpl.xrpToDrops(sellerAmount),
      }
      
      if (memo) {
        payment1.Memos = [{
          Memo: {
            MemoType: Buffer.from('text/plain', 'utf8').toString('hex').toUpperCase(),
            MemoData: Buffer.from(`Seller: ${memo}`, 'utf8').toString('hex').toUpperCase(),
          },
        }]
      }
      
      // Payment 2: To Platform (fee)
      const payment2: any = {
        TransactionType: 'Payment',
        Account: wallet.address,
        Destination: toPlatformAddress,
        Amount: xrpl.xrpToDrops(platformFee),
      }
      
      if (memo) {
        payment2.Memos = [{
          Memo: {
            MemoType: Buffer.from('text/plain', 'utf8').toString('hex').toUpperCase(),
            MemoData: Buffer.from(`Platform Fee: ${memo}`, 'utf8').toString('hex').toUpperCase(),
          },
        }]
      }
      
      // Submit payment 1
      console.log('📤 Submitting seller payment...')
      const prepared1 = await client.autofill(payment1)
      const signed1 = wallet.sign(prepared1)
      const result1 = await client.submitAndWait(signed1.tx_blob)
      
      // Submit payment 2
      console.log('📤 Submitting platform fee...')
      const prepared2 = await client.autofill(payment2)
      const signed2 = wallet.sign(prepared2)
      const result2 = await client.submitAndWait(signed2.tx_blob)
      
      const txResult: XRPTransactionResult = {
        hash: result1.result.hash, // Primary transaction hash
        status: (result1.result.meta as any)?.TransactionResult || 'unknown',
        fee: xrpl.dropsToXrp(String(Number(prepared1.Fee || '0') + Number(prepared2.Fee || '0'))),
        explorerUrl: `${EXPLORER_URL}/transactions/${result1.result.hash}`,
        ledgerIndex: result1.result.ledger_index,
      }
      
      setLastTransaction(txResult)
      console.log(`✅ Atomic payment complete: ${txResult.hash}`)
      
      return txResult
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaction failed'
      setLastError(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [client, isConnected])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      if (client) {
        client.disconnect()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load wallets from environment if available
  useEffect(() => {
    const loadEnvWallets = async () => {
      if (!isConnected) return
      
      const buyerSeed = process.env.NEXT_PUBLIC_BUYER_WALLET_SEED
      const sellerSeed = process.env.NEXT_PUBLIC_SELLER_WALLET_SEED
      const platformSeed = process.env.NEXT_PUBLIC_PLATFORM_WALLET_SEED
      
      if (buyerSeed) {
        try {
          const wallet = await loadWallet(buyerSeed)
          setBuyerWallet(wallet)
          console.log('✅ Buyer wallet loaded from env')
        } catch (e) {
          console.log('⚠️ Could not load buyer wallet from env')
        }
      }
      
      if (sellerSeed) {
        try {
          const wallet = await loadWallet(sellerSeed)
          setSellerWallet(wallet)
          console.log('✅ Seller wallet loaded from env')
        } catch (e) {
          console.log('⚠️ Could not load seller wallet from env')
        }
      }
      
      if (platformSeed) {
        try {
          const wallet = await loadWallet(platformSeed)
          setPlatformWallet(wallet)
          console.log('✅ Platform wallet loaded from env')
        } catch (e) {
          console.log('⚠️ Could not load platform wallet from env')
        }
      }
    }
    
    loadEnvWallets()
  }, [isConnected, loadWallet])

  const value: XRPLContextType = {
    client,
    isConnected,
    isConnecting,
    networkName: NETWORK,
    buyerWallet,
    sellerWallet,
    platformWallet,
    isLoading,
    connect,
    disconnect,
    createWallet,
    loadWallet,
    getBalance,
    sendPayment,
    sendAtomicPayment,
    setBuyerWallet,
    setSellerWallet,
    setPlatformWallet,
    lastError,
    lastTransaction,
  }

  return (
    <XRPLContext.Provider value={value}>
      {children}
    </XRPLContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================
export function useXRPL() {
  const context = useContext(XRPLContext)
  if (!context) {
    throw new Error('useXRPL must be used within XRPLWalletProvider')
  }
  return context
}

// ============================================
// UTILITY FUNCTIONS (can be used without context)
// ============================================
export async function xrpToDrops(xrp: string): Promise<string> {
  const xrpl = await import('xrpl')
  return xrpl.xrpToDrops(xrp)
}

export async function dropsToXrp(drops: string): Promise<string> {
  const xrpl = await import('xrpl')
  return xrpl.dropsToXrp(drops)
}
