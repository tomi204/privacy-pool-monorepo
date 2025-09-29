"use client";

import { ethers } from "ethers";
import {
  createContext,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
  useAppKitState,
} from "@reown/appkit/react";

export interface UseReownEthersSignerState {
  provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  error: Error | undefined;
  connect: () => void;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
  ethersBrowserProvider: ethers.BrowserProvider | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  initialMockChains: Readonly<Record<number, string>> | undefined;
}

function useReownEthersSignerInternal(parameters: {
  initialMockChains?: Readonly<Record<number, string>>;
}): UseReownEthersSignerState {
  const { initialMockChains } = parameters;
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
  const { chainId } = useAppKitNetwork();
  const { open } = useAppKit();

  const [ethersSigner, setEthersSigner] = useState<
    ethers.JsonRpcSigner | undefined
  >(undefined);
  const [ethersBrowserProvider, setEthersBrowserProvider] = useState<
    ethers.BrowserProvider | undefined
  >(undefined);
  const [ethersReadonlyProvider, setEthersReadonlyProvider] = useState<
    ethers.ContractRunner | undefined
  >(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  const chainIdRef = useRef<number | undefined>(
    typeof chainId === "number" ? chainId : undefined
  );
  const ethersSignerRef = useRef<ethers.JsonRpcSigner | undefined>(undefined);

  // Create stable functions using useMemo to prevent infinite loops
  const sameChain = useRef((chainId: number | undefined) => {
    return chainId === chainIdRef.current;
  });

  const sameSigner = useRef(
    (ethersSigner: ethers.JsonRpcSigner | undefined) => {
      return ethersSigner === ethersSignerRef.current;
    }
  );

  const connect = () => {
    open();
  };

  useEffect(() => {
    chainIdRef.current = typeof chainId === "number" ? chainId : undefined;
  }, [chainId]);

  useEffect(() => {
    const numericChainId = typeof chainId === "number" ? chainId : undefined;

    if (!walletProvider || !numericChainId || !isConnected || !address) {
      ethersSignerRef.current = undefined;
      setEthersSigner(undefined);
      setEthersBrowserProvider(undefined);
      setEthersReadonlyProvider(undefined);
      setError(undefined);
      return;
    }

    try {
      console.warn(
        `[useReownEthersSignerInternal] create new ethers.BrowserProvider(), chainId=${numericChainId}`
      );

      const bp: ethers.BrowserProvider = new ethers.BrowserProvider(
        walletProvider as ethers.Eip1193Provider
      );
      let rop: ethers.ContractRunner = bp;
      const rpcUrl: string | undefined = initialMockChains?.[numericChainId];

      if (rpcUrl) {
        // Try to avoid using WalletConnect provider for view functions in mock mode
        // Similar to MetaMask, this can help avoid cache issues with dev nodes
        rop = new ethers.JsonRpcProvider(rpcUrl);
        console.warn(
          `[useReownEthersSignerInternal] create new readonly provider ethers.JsonRpcProvider(${rpcUrl}), chainId=${numericChainId}`
        );
      } else {
        console.warn(
          `[useReownEthersSignerInternal] use ethers.BrowserProvider() as readonly provider, chainId=${numericChainId}`
        );
      }

      const s = new ethers.JsonRpcSigner(bp, address);
      ethersSignerRef.current = s;
      setEthersSigner(s);
      setEthersBrowserProvider(bp);
      setEthersReadonlyProvider(rop);
      setError(undefined);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error(
        "[useReownEthersSignerInternal] Error creating providers:",
        error
      );
      setError(error);
      ethersSignerRef.current = undefined;
      setEthersSigner(undefined);
      setEthersBrowserProvider(undefined);
      setEthersReadonlyProvider(undefined);
    }
  }, [walletProvider, chainId, isConnected, address, initialMockChains]);

  return {
    sameChain,
    sameSigner,
    provider: walletProvider as ethers.Eip1193Provider | undefined,
    chainId: typeof chainId === "number" ? chainId : undefined,
    accounts: address ? [address] : undefined,
    isConnected,
    connect,
    ethersBrowserProvider,
    ethersReadonlyProvider,
    ethersSigner,
    error,
    initialMockChains,
  };
}

const ReownEthersSignerContext = createContext<
  UseReownEthersSignerState | undefined
>(undefined);

interface ReownEthersSignerProviderProps {
  children: ReactNode;
  initialMockChains?: Readonly<Record<number, string>>;
}

export const ReownEthersSignerProvider: React.FC<
  ReownEthersSignerProviderProps
> = ({ children, initialMockChains = {} }) => {
  const props = useReownEthersSignerInternal({ initialMockChains });
  return (
    <ReownEthersSignerContext.Provider value={props}>
      {children}
    </ReownEthersSignerContext.Provider>
  );
};

export function useReownEthersSigner() {
  const context = useContext(ReownEthersSignerContext);
  if (context === undefined) {
    throw new Error(
      "useReownEthersSigner must be used within a ReownEthersSignerProvider"
    );
  }
  return context;
}
