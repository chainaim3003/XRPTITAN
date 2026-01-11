import type { Metadata } from 'next'
import './globals.css'
import Navigation from './Navigation'
import { XRPLWalletProvider } from './lib/xrpl-context'

export const metadata: Metadata = {
  title: 'XRP TITAN - Trade Finance Platform',
  description: 'Enterprise Trade Finance Platform powered by XRP Ledger',
  keywords: ['XRP', 'XRPL', 'Trade Finance', 'Blockchain', 'KERI', 'vLEI'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Prevent MetaMask from auto-connecting - this app uses XRP Ledger */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // This app uses XRP Ledger, not Ethereum/MetaMask
              if (typeof window !== 'undefined' && window.ethereum) {
                window.ethereum.autoRefreshOnNetworkChange = false;
              }
            `,
          }}
        />
      </head>
      <body>
        <XRPLWalletProvider>
          <Navigation />
          {children}
        </XRPLWalletProvider>
      </body>
    </html>
  )
}
