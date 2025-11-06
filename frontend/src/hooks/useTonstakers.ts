import { useState, useEffect, useCallback } from "react";
import { useTonConnectUI, useTonAddress, useTonWallet } from "@tonconnect/ui-react";
import { Tonstakers } from "tonstakers-sdk";

// Types for Tonstakers SDK responses
export type WithdrawalNFT = {
  address: string;
  amount: string;
  estimatedPayoutDate: Date;
  roundEndTime: Date;
};

export type PoolRates = {
  TONUSD: number;
  tsTONTON: number;
  tsTONTONProjected: number;
};

export type RoundTimestamps = {
  start: Date;
  end: Date;
};

export function useTonstakers() {
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  const wallet = useTonWallet();
  const [sdk, setSdk] = useState<Tonstakers | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Balance states
  const [tonBalance, setTonBalance] = useState<string>("0");
  const [stakedBalance, setStakedBalance] = useState<string>("0");
  const [availableBalance, setAvailableBalance] = useState<string>("0");

  // Pool info states
  const [tvl, setTvl] = useState<string>("0");
  const [stakersCount, setStakersCount] = useState<number>(0);
  const [instantLiquidity, setInstantLiquidity] = useState<string>("0");
  const [currentApy, setCurrentApy] = useState<number>(0);

  // Rates
  const [rates, setRates] = useState<PoolRates>({
    TONUSD: 0,
    tsTONTON: 1,
    tsTONTONProjected: 1,
  });

  // Withdrawal NFTs
  const [withdrawalNFTs, setWithdrawalNFTs] = useState<WithdrawalNFT[]>([]);

  // Round timestamps
  const [roundTimestamps, setRoundTimestamps] = useState<RoundTimestamps | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to fetch wallet balance from TON blockchain
  const fetchWalletBalance = useCallback(async (): Promise<string> => {
    if (!userAddress) return "0";

    try {
      // Use TON Center API (mainnet by default, testnet if detected)
      const isTestnet = wallet?.account.chain === "-3"; // -3 is testnet chain ID
      const apiUrl = isTestnet
        ? "https://testnet.toncenter.com/api/v2/getAddressBalance"
        : "https://toncenter.com/api/v2/getAddressBalance";

      const response = await fetch(`${apiUrl}?address=${userAddress}`);
      const data = await response.json();

      if (data.ok && data.result) {
        console.log("Wallet balance fetched from", isTestnet ? "testnet" : "mainnet", ":", data.result);
        return String(data.result); // Returns balance in nanotons as string
      }
    } catch (error) {
      console.warn("Failed to fetch wallet balance from API:", error);
    }

    return "0";
  }, [userAddress, wallet]);

  // Initialize SDK when wallet connects
  useEffect(() => {
    if (!userAddress) {
      setSdk(null);
      setIsInitialized(false);
      return;
    }

    let isMounted = true;

    const initSdk = async () => {
      try {
        setIsLoading(true);
        console.log("🚀 Initializing Tonstakers SDK for address:", userAddress);

        // Initialize with testnet - SDK auto-detects testnet
        const tonStakers = new Tonstakers({ connector: tonConnectUI });
        console.log("📦 Tonstakers instance created");

        // Wait for initialization event with timeout
        const initPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.warn("⏱️ SDK initialization timeout after 30 seconds");
            reject(new Error("SDK initialization timeout after 30 seconds"));
          }, 30000); // 30 second timeout

          const initHandler = () => {
            clearTimeout(timeout);
            console.log("✅ Tonstakers SDK initialized successfully (event fired)");
            // Double check the ready property
            if (tonStakers.ready) {
              console.log("✅ SDK ready property is true");
              resolve();
            } else {
              console.warn("⚠️ Event fired but SDK not ready yet, polling...");
              // Poll for ready state
              const pollInterval = setInterval(() => {
                if (tonStakers.ready) {
                  clearInterval(pollInterval);
                  console.log("✅ SDK ready property is now true");
                  resolve();
                }
              }, 100);

              // Safety timeout for polling
              setTimeout(() => {
                clearInterval(pollInterval);
                if (!tonStakers.ready) {
                  reject(new Error("SDK ready property never became true"));
                }
              }, 10000);
            }
          };

          tonStakers.addEventListener("initialized", initHandler);
          console.log("👂 Added 'initialized' event listener");
        });

        // Also handle deinitialization
        const deinitHandler = () => {
          console.log("⚠️ Tonstakers SDK deinitialized");
          if (isMounted) {
            setIsInitialized(false);
          }
        };

        tonStakers.addEventListener("deinitialized", deinitHandler);

        // Wait for the initialization event and ready state
        await initPromise;
        console.log("✅ Init promise resolved");

        if (isMounted) {
          setSdk(tonStakers);
          setIsInitialized(true);
          console.log("✅ SDK ready for operations");
        }
      } catch (error) {
        console.error("❌ Failed to initialize Tonstakers SDK:", error);
        console.error("Error details:", error);
        if (isMounted) {
          setSdk(null);
          setIsInitialized(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initSdk();

    // Cleanup on disconnect
    return () => {
      isMounted = false;
      if (sdk) {
        try {
          sdk.clearStorageUserData();
        } catch (error) {
          console.warn("Error clearing storage data:", error);
        }
      }
    };
  }, [userAddress, tonConnectUI]);

  // Fetch all data when SDK is initialized
  const refreshData = useCallback(async () => {
    if (!isInitialized) {
      console.warn("Cannot refresh data: SDK not initialized");
      return;
    }

    try {
      setIsLoading(true);

      // Fetch wallet balance directly from blockchain (not from SDK)
      const walletBalance = await fetchWalletBalance();
      setTonBalance(walletBalance);
      console.log("Wallet balance set to:", walletBalance);

      // Fetch staking-specific balances from SDK
      if (sdk) {
        try {
          const [staked, available] = await Promise.all([
            sdk.getStakedBalance().catch((e) => {
              console.warn("Failed to get staked balance:", e);
              return 0;
            }),
            sdk.getAvailableBalance().catch((e) => {
              console.warn("Failed to get available balance:", e);
              return 0;
            }),
          ]);

          setStakedBalance(String(staked));
          setAvailableBalance(String(available));
          console.log("Staked balance:", staked, "Available:", available);
        } catch (error) {
          console.warn("Failed to fetch staking balances:", error);
        }
      }

      // Fetch pool info with individual error handling
      if (sdk) {
        try {
          const [poolTvl, stakers, liquidity, apy] = await Promise.all([
            sdk.getTvl().catch((e) => {
              console.warn("Failed to get TVL:", e);
              return 0;
            }),
            sdk.getStakersCount().catch((e) => {
              console.warn("Failed to get stakers count:", e);
              return 0;
            }),
            sdk.getInstantLiquidity().catch((e) => {
              console.warn("Failed to get instant liquidity:", e);
              return 0;
            }),
            sdk.getCurrentApy().catch((e) => {
              console.warn("Failed to get APY:", e);
              return 0;
            }),
          ]);

          setTvl(String(poolTvl));
          setStakersCount(stakers);
          setInstantLiquidity(String(liquidity));
          setCurrentApy(apy);
        } catch (error) {
          console.warn("Failed to fetch pool info:", error);
        }

        // Fetch rates with error handling
        try {
          const ratesData = await sdk.getRates();
          setRates(ratesData);
        } catch (error) {
          console.warn("Failed to fetch rates:", error);
        }

        // Fetch withdrawal NFTs with error handling
        try {
          const nfts = await sdk.getActiveWithdrawalNFTs();
          // Convert SDK format to our format
          const mappedNfts: WithdrawalNFT[] = nfts.map((nft: any) => ({
            address: nft.address?.address || "",
            amount: String(nft.tsTONAmount || 0),
            estimatedPayoutDate: new Date(nft.estimatedPayoutDateTime || Date.now()),
            roundEndTime: new Date(nft.roundEndTime || Date.now()),
          }));
          setWithdrawalNFTs(mappedNfts);
        } catch (error) {
          console.warn("Failed to fetch withdrawal NFTs:", error);
        }

        // Fetch round timestamps with error handling (if method exists)
        try {
          if (typeof (sdk as any).getRoundTimestamps === 'function') {
            const timestamps = await (sdk as any).getRoundTimestamps();
            setRoundTimestamps(timestamps);
          } else {
            console.warn("getRoundTimestamps method not available in this SDK version");
          }
        } catch (error) {
          console.warn("Failed to fetch round timestamps:", error);
        }
      }
    } catch (error) {
      console.error("Failed to fetch Tonstakers data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isInitialized, fetchWalletBalance]);

  // Auto-refresh data when initialized
  useEffect(() => {
    if (isInitialized) {
      refreshData();
    }
  }, [isInitialized, refreshData]);

  // Fetch wallet balance even if SDK not initialized (fallback)
  useEffect(() => {
    if (userAddress && !isInitialized && !isLoading) {
      console.log("SDK not initialized, fetching wallet balance only...");
      fetchWalletBalance().then((balance) => {
        setTonBalance(balance);
        console.log("Fallback wallet balance:", balance);
      });
    }
  }, [userAddress, isInitialized, isLoading, fetchWalletBalance]);

  // Staking operations
  const stake = useCallback(
    async (amount: string) => {
      if (!sdk || !isInitialized) {
        throw new Error("SDK not initialized. Please ensure your wallet is connected.");
      }

      if (!sdk.ready) {
        throw new Error("SDK is not fully ready yet. Please wait a moment and try again.");
      }

      try {
        // Convert string amount to BigInt for SDK
        const amountBigInt = BigInt(amount);
        const tx = await sdk.stake(amountBigInt);
        if (!tx) {
          throw new Error("Failed to prepare staking transaction");
        }
        // SDK returns transaction response which has the correct format
        await tonConnectUI.sendTransaction(tx as any);
        // Wait a bit before refreshing to ensure blockchain updates
        setTimeout(() => refreshData(), 2000);
        return true;
      } catch (error) {
        console.error("Stake failed:", error);
        // Provide more user-friendly error messages
        if (error instanceof Error) {
          if (error.message.includes("User rejected")) {
            throw new Error("Transaction was rejected by user");
          }
          throw error;
        }
        throw new Error("Staking transaction failed. Please try again.");
      }
    },
    [sdk, isInitialized, tonConnectUI, refreshData]
  );

  const stakeMax = useCallback(async () => {
    if (!sdk || !isInitialized) {
      throw new Error("SDK not initialized. Please ensure your wallet is connected.");
    }

    if (!sdk.ready) {
      throw new Error("SDK is not fully ready yet. Please wait a moment and try again.");
    }

    try {
      const tx = await sdk.stakeMax();
      if (!tx) {
        throw new Error("Failed to prepare staking transaction");
      }
      await tonConnectUI.sendTransaction(tx as any);
      setTimeout(() => refreshData(), 2000);
      return true;
    } catch (error) {
      console.error("Stake max failed:", error);
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          throw new Error("Transaction was rejected by user");
        }
        throw error;
      }
      throw new Error("Staking transaction failed. Please try again.");
    }
  }, [sdk, isInitialized, tonConnectUI, refreshData]);

  // Unstaking operations
  const unstake = useCallback(
    async (amount: string) => {
      if (!sdk || !isInitialized) {
        throw new Error("SDK not initialized. Please ensure your wallet is connected.");
      }

      if (!sdk.ready) {
        throw new Error("SDK is not fully ready yet. Please wait a moment and try again.");
      }

      try {
        const amountBigInt = BigInt(amount);
        const tx = await sdk.unstake(amountBigInt);
        if (!tx) {
          throw new Error("Failed to prepare withdrawal transaction");
        }
        await tonConnectUI.sendTransaction(tx as any);
        setTimeout(() => refreshData(), 2000);
        return true;
      } catch (error) {
        console.error("Unstake failed:", error);
        if (error instanceof Error) {
          if (error.message.includes("User rejected")) {
            throw new Error("Transaction was rejected by user");
          }
          throw error;
        }
        throw new Error("Withdrawal transaction failed. Please try again.");
      }
    },
    [sdk, isInitialized, tonConnectUI, refreshData]
  );

  const unstakeInstant = useCallback(
    async (amount: string) => {
      if (!sdk || !isInitialized) {
        throw new Error("SDK not initialized. Please ensure your wallet is connected.");
      }

      if (!sdk.ready) {
        throw new Error("SDK is not fully ready yet. Please wait a moment and try again.");
      }

      try {
        const amountBigInt = BigInt(amount);
        const tx = await sdk.unstakeInstant(amountBigInt);
        if (!tx) {
          throw new Error("Failed to prepare instant withdrawal transaction");
        }
        await tonConnectUI.sendTransaction(tx as any);
        setTimeout(() => refreshData(), 2000);
        return true;
      } catch (error) {
        console.error("Instant unstake failed:", error);
        if (error instanceof Error) {
          if (error.message.includes("User rejected")) {
            throw new Error("Transaction was rejected by user");
          }
          if (error.message.includes("insufficient")) {
            throw new Error("Insufficient liquidity for instant withdrawal");
          }
          throw error;
        }
        throw new Error("Instant withdrawal failed. Please try again.");
      }
    },
    [sdk, isInitialized, tonConnectUI, refreshData]
  );

  const unstakeBestRate = useCallback(
    async (amount: string) => {
      if (!sdk || !isInitialized) {
        throw new Error("SDK not initialized. Please ensure your wallet is connected.");
      }

      if (!sdk.ready) {
        throw new Error("SDK is not fully ready yet. Please wait a moment and try again.");
      }

      try {
        const amountBigInt = BigInt(amount);
        const tx = await sdk.unstakeBestRate(amountBigInt);
        if (!tx) {
          throw new Error("Failed to prepare best rate withdrawal transaction");
        }
        await tonConnectUI.sendTransaction(tx as any);
        setTimeout(() => refreshData(), 2000);
        return true;
      } catch (error) {
        console.error("Best rate unstake failed:", error);
        if (error instanceof Error) {
          if (error.message.includes("User rejected")) {
            throw new Error("Transaction was rejected by user");
          }
          throw error;
        }
        throw new Error("Best rate withdrawal failed. Please try again.");
      }
    },
    [sdk, isInitialized, tonConnectUI, refreshData]
  );

  return {
    // Connection state
    isConnected: !!userAddress,
    isInitialized: isInitialized && (sdk?.ready ?? false), // Ensure SDK is actually ready
    isLoading,

    // Balances
    tonBalance,
    stakedBalance,
    availableBalance,

    // Pool info
    tvl,
    stakersCount,
    instantLiquidity,
    currentApy,

    // Rates
    rates,

    // Withdrawal NFTs
    withdrawalNFTs,

    // Round info
    roundTimestamps,

    // Operations
    stake,
    stakeMax,
    unstake,
    unstakeInstant,
    unstakeBestRate,

    // Refresh data
    refreshData,
  };
}
