import { useState, useEffect, useCallback } from "react";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { TonStakers } from "tonstakers-sdk";

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
  const [sdk, setSdk] = useState<TonStakers | null>(null);
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

  // Initialize SDK when wallet connects
  useEffect(() => {
    if (!userAddress) {
      setSdk(null);
      setIsInitialized(false);
      return;
    }

    const initSdk = async () => {
      try {
        setIsLoading(true);
        // Initialize with testnet - SDK auto-detects testnet
        const tonStakers = new TonStakers(tonConnectUI);

        // Wait for initialization event
        const initPromise = new Promise<void>((resolve) => {
          tonStakers.addEventListener("initialized", () => {
            console.log("Tonstakers SDK initialized");
            resolve();
          });
        });

        // Also handle deinitialization
        tonStakers.addEventListener("deinitialized", () => {
          console.log("Tonstakers SDK deinitialized");
          setIsInitialized(false);
        });

        await initPromise;

        setSdk(tonStakers);
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize Tonstakers SDK:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initSdk();

    // Cleanup on disconnect
    return () => {
      if (sdk) {
        sdk.clearStorageUserData();
      }
    };
  }, [userAddress, tonConnectUI]);

  // Fetch all data when SDK is initialized
  const refreshData = useCallback(async () => {
    if (!sdk || !isInitialized) return;

    try {
      setIsLoading(true);

      // Fetch balances
      const [balance, staked, available] = await Promise.all([
        sdk.getBalance(),
        sdk.getStakedBalance(),
        sdk.getAvailableBalance(),
      ]);

      setTonBalance(balance);
      setStakedBalance(staked);
      setAvailableBalance(available);

      // Fetch pool info
      const [poolTvl, stakers, liquidity, apy] = await Promise.all([
        sdk.getTvl(),
        sdk.getStakersCount(),
        sdk.getInstantLiquidity(),
        sdk.getCurrentApy(),
      ]);

      setTvl(poolTvl);
      setStakersCount(stakers);
      setInstantLiquidity(liquidity);
      setCurrentApy(apy);

      // Fetch rates
      const ratesData = await sdk.getRates();
      setRates(ratesData);

      // Fetch withdrawal NFTs
      const nfts = await sdk.getActiveWithdrawalNFTs();
      setWithdrawalNFTs(nfts);

      // Fetch round timestamps
      const timestamps = await sdk.getRoundTimestamps();
      setRoundTimestamps(timestamps);
    } catch (error) {
      console.error("Failed to fetch Tonstakers data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isInitialized]);

  // Auto-refresh data when initialized
  useEffect(() => {
    if (isInitialized) {
      refreshData();
    }
  }, [isInitialized, refreshData]);

  // Staking operations
  const stake = useCallback(
    async (amount: string) => {
      if (!sdk) throw new Error("SDK not initialized");

      try {
        const tx = await sdk.stake(amount);
        await tonConnectUI.sendTransaction(tx);
        await refreshData();
        return true;
      } catch (error) {
        console.error("Stake failed:", error);
        throw error;
      }
    },
    [sdk, tonConnectUI, refreshData]
  );

  const stakeMax = useCallback(async () => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      const tx = await sdk.stakeMax();
      await tonConnectUI.sendTransaction(tx);
      await refreshData();
      return true;
    } catch (error) {
      console.error("Stake max failed:", error);
      throw error;
    }
  }, [sdk, tonConnectUI, refreshData]);

  // Unstaking operations
  const unstake = useCallback(
    async (amount: string) => {
      if (!sdk) throw new Error("SDK not initialized");

      try {
        const tx = await sdk.unstake(amount);
        await tonConnectUI.sendTransaction(tx);
        await refreshData();
        return true;
      } catch (error) {
        console.error("Unstake failed:", error);
        throw error;
      }
    },
    [sdk, tonConnectUI, refreshData]
  );

  const unstakeInstant = useCallback(
    async (amount: string) => {
      if (!sdk) throw new Error("SDK not initialized");

      try {
        const tx = await sdk.unstakeInstant(amount);
        await tonConnectUI.sendTransaction(tx);
        await refreshData();
        return true;
      } catch (error) {
        console.error("Instant unstake failed:", error);
        throw error;
      }
    },
    [sdk, tonConnectUI, refreshData]
  );

  const unstakeBestRate = useCallback(
    async (amount: string) => {
      if (!sdk) throw new Error("SDK not initialized");

      try {
        const tx = await sdk.unstakeBestRate(amount);
        await tonConnectUI.sendTransaction(tx);
        await refreshData();
        return true;
      } catch (error) {
        console.error("Best rate unstake failed:", error);
        throw error;
      }
    },
    [sdk, tonConnectUI, refreshData]
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
