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
      // Try to use TON Center API (testnet)
      const isTestnet = wallet?.account.chain === "-3"; // -3 is testnet chain ID
      const apiUrl = isTestnet
        ? "https://testnet.toncenter.com/api/v2/getAddressBalance"
        : "https://toncenter.com/api/v2/getAddressBalance";

      const response = await fetch(`${apiUrl}?address=${userAddress}`);
      const data = await response.json();

      if (data.ok && data.result) {
        console.log("Wallet balance fetched:", data.result);
        return data.result; // Returns balance in nanotons
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
    let initListenerAdded = false;
    let deinitListenerAdded = false;

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
            resolve();
          };

          tonStakers.addEventListener("initialized", initHandler);
          initListenerAdded = true;
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
        deinitListenerAdded = true;

        // Try to wait for the initialization event
        try {
          await initPromise;
          console.log("✅ Init promise resolved");
        } catch (timeoutError) {
          // If timeout, check if SDK methods are available anyway
          console.warn("⚠️ Initialization event timeout, checking SDK methods...");

          // Try calling a basic method to see if SDK is actually ready
          try {
            if (tonStakers && typeof tonStakers.getTvl === 'function') {
              console.log("✅ SDK methods are available despite timeout, proceeding...");
            } else {
              throw new Error("SDK methods not available");
            }
          } catch (methodError) {
            console.error("❌ SDK not functional:", methodError);
            throw timeoutError;
          }
        }

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
              return "0";
            }),
            sdk.getAvailableBalance().catch((e) => {
              console.warn("Failed to get available balance:", e);
              return "0";
            }),
          ]);

          setStakedBalance(staked);
          setAvailableBalance(available);
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
              return "0";
            }),
            sdk.getStakersCount().catch((e) => {
              console.warn("Failed to get stakers count:", e);
              return 0;
            }),
            sdk.getInstantLiquidity().catch((e) => {
              console.warn("Failed to get instant liquidity:", e);
              return "0";
            }),
            sdk.getCurrentApy().catch((e) => {
              console.warn("Failed to get APY:", e);
              return 0;
            }),
          ]);

          setTvl(poolTvl);
          setStakersCount(stakers);
          setInstantLiquidity(liquidity);
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
          setWithdrawalNFTs(nfts);
        } catch (error) {
          console.warn("Failed to fetch withdrawal NFTs:", error);
        }

        // Fetch round timestamps with error handling
        try {
          const timestamps = await sdk.getRoundTimestamps();
          setRoundTimestamps(timestamps);
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

      try {
        const tx = await sdk.stake(amount);
        if (!tx) {
          throw new Error("Failed to prepare staking transaction");
        }
        await tonConnectUI.sendTransaction(tx);
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

    try {
      const tx = await sdk.stakeMax();
      if (!tx) {
        throw new Error("Failed to prepare staking transaction");
      }
      await tonConnectUI.sendTransaction(tx);
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

      try {
        const tx = await sdk.unstake(amount);
        if (!tx) {
          throw new Error("Failed to prepare withdrawal transaction");
        }
        await tonConnectUI.sendTransaction(tx);
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

      try {
        const tx = await sdk.unstakeInstant(amount);
        if (!tx) {
          throw new Error("Failed to prepare instant withdrawal transaction");
        }
        await tonConnectUI.sendTransaction(tx);
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

      try {
        const tx = await sdk.unstakeBestRate(amount);
        if (!tx) {
          throw new Error("Failed to prepare best rate withdrawal transaction");
        }
        await tonConnectUI.sendTransaction(tx);
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
    isInitialized,
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
