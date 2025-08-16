import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import { BitcoinWalletConnectors } from "@dynamic-labs/bitcoin";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { SuiWalletConnectors } from "@dynamic-labs/sui";
import { zircuit } from "viem/chains";
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DynamicContextProvider
      settings={{
        environmentId: "3ce1d18d-377a-4362-bdbb-30c249f09c6c",
        walletConnectors: [
          BitcoinWalletConnectors,
          EthereumWalletConnectors,
          SolanaWalletConnectors,
          SuiWalletConnectors,
        ],
        overrides: {
          evmNetworks: [
            {
              chainId: 48898, // Zircuit Garfield testnet (BF02 in hex)
              chainName: "Zircuit Garfield Testnet",
              name: "Zircuit Garfield",
              networkId: 48898,
              nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
                iconUrl: "https://app.dynamic.xyz/assets/networks/eth.svg",
              },
              rpcUrls: ["https://garfield-testnet.zircuit.com/"],
              blockExplorerUrls: ["https://garfield-testnet.zircuit.com/"],
              iconUrls: ["https://app.dynamic.xyz/assets/networks/eth.svg"],
              vanityName: "Zircuit Garfield",
            },
          ],
        },
      }}
    >
      <App />
    </DynamicContextProvider>
  </StrictMode>,
)
