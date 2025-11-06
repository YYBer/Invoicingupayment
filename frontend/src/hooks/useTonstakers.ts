import { useState, useEffect, useCallback } from "react";
import { useTonConnectUI, useTonAddress, useTonWallet } from "@tonconnect/ui-react";
import { Tonstakers } from "tonstakers-sdk";

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

export function useTonstakers() {
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  const wallet = useTonWallet();
  const [sdk, setSdk] = useState<Tonstakers | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [tonBalance, setTonBalance] = useState<string>("0");
  const [stakedBalance, setStakedBalance] = useState<string>("0");
  const [availableBalance, setAvailableBalance] = useState<string>("0");
  const [tvl, setTvl] = useState<string>("0");
  const [stakersCount, setStakersCount] = useState<number>(0);
  const [instantLiquidity, setInstantLiquidity] = useState<string>("0");
  const [currentApy, setCurrentApy] = useState<number>(0);
  const [rates, setRates] = useState<PoolRates>({
    TONUSD: 0,
    tsTONTON: 1,
    tsTONTONProjected: 1,
  });
  const [withdrawalNFTs, setWithdrawalNFTs] = useState<WithdrawalNFT[]>([]);

  const fetchWalletBalance = useCallback(async (): Promise<string> => {
    if (!userAddress) return "0";

    try {
      const isTestnet = wallet?.account.chain === "-3";
      const apiUrl = isTestnet
        ? "https://testnet.toncenter.com/api/v2/getAddressBalance"
        : "https://toncenter.com/api/v2/getAddressBalance";

      const response = await fetch(`${apiUrl}?address=${userAddress}`);
      const data = await response.json();

      if (data.ok && data.result) {
        return String(data.result);
      }
    } catch (error) {
      console.warn("Failed to fetch wallet balance:", error);
    }

    return "0";
  }, [userAddress, wallet]);

  useEffect(() => {
    if (!userAddress) {
      setSdk(null);
      setIsInitialized(false);
      return;
    }

    let isMounted = true;
    let tonstakersInstance: Tonstakers | null = null;

    const initSdk = async () => {
      try {
        setIsLoading(true);

        await new Promise(resolve => setTimeout(resolve, 500));

        if (!isMounted) return;

        tonstakersInstance = new Tonstakers({ connector: tonConnectUI });

        const initPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("SDK initialization timeout"));
          }, 30000);

          const initHandler = () => {
            clearTimeout(timeout);
            if (tonstakersInstance && tonstakersInstance.ready) {
              resolve();
            } else {
              const pollInterval = setInterval(() => {
                if (tonstakersInstance && tonstakersInstance.ready) {
                  clearInterval(pollInterval);
                  resolve();
                }
              }, 200);

              setTimeout(() => {
                clearInterval(pollInterval);
                if (!tonstakersInstance || !tonstakersInstance.ready) {
                  reject(new Error("SDK not ready"));
                }
              }, 10000);
            }
          };

          if (tonstakersInstance) {
            tonstakersInstance.addEventListener("initialized", initHandler);
          }
        });

        await initPromise;

        if (isMounted && tonstakersInstance) {
          setSdk(tonstakersInstance);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Failed to initialize Tonstakers SDK:", error);
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

    return () => {
      isMounted = false;
      if (tonstakersInstance) {
        try {
          tonstakersInstance.clearStorageUserData();
        } catch (error) {
          console.warn("Error clearing storage:", error);
        }
      }
    };
  }, [userAddress, tonConnectUI]);

  const refreshData = useCallback(async () => {
    if (!isInitialized || !sdk || !sdk.ready || isRefreshing) return;

    try {
      setIsRefreshing(true);

      await Promise.all([
        fetchWalletBalance().then(setTonBalance).catch(() => setTonBalance("0")),

        sdk.getStakedBalance()
          .then(v => setStakedBalance(String(v)))
          .catch(() => setStakedBalance("0")),

        sdk.getAvailableBalance()
          .then(v => setAvailableBalance(String(v)))
          .catch(() => setAvailableBalance("0")),

        sdk.getTvl()
          .then(v => setTvl(String(v)))
          .catch(() => setTvl("0")),

        sdk.getStakersCount()
          .then(setStakersCount)
          .catch(() => setStakersCount(0)),

        sdk.getInstantLiquidity()
          .then(v => setInstantLiquidity(String(v)))
          .catch(() => setInstantLiquidity("0")),

        sdk.getCurrentApy()
          .then(setCurrentApy)
          .catch(() => setCurrentApy(0)),

        sdk.getRates()
          .then(setRates)
          .catch(() => setRates({ TONUSD: 0, tsTONTON: 1, tsTONTONProjected: 1 })),

        sdk.getActiveWithdrawalNFTs()
          .then(nfts => {
            const mapped: WithdrawalNFT[] = nfts.map((nft: any) => ({
              address: nft.address?.address || "",
              amount: String(nft.tsTONAmount || 0),
              estimatedPayoutDate: new Date(nft.estimatedPayoutDateTime || Date.now()),
              roundEndTime: new Date(nft.roundEndTime || Date.now()),
            }));
            setWithdrawalNFTs(mapped);
          })
          .catch(() => setWithdrawalNFTs([])),
      ]);
    } catch (error) {
      console.warn("Failed to fetch data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [sdk, isInitialized, isRefreshing, fetchWalletBalance]);

  useEffect(() => {
    if (isInitialized && sdk?.ready) {
      const timer = setTimeout(() => {
        refreshData();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isInitialized, sdk?.ready]);

  useEffect(() => {
    if (userAddress && !isInitialized && !isLoading) {
      fetchWalletBalance().then(setTonBalance).catch(() => {});
    }
  }, [userAddress, isInitialized, isLoading, fetchWalletBalance]);

  const stake = useCallback(
    async (amount: string) => {
      if (!sdk || !isInitialized || !sdk.ready) {
        throw new Error("SDK not ready");
      }

      const tx = await sdk.stake(BigInt(amount));
      if (!tx) throw new Error("Failed to prepare transaction");

      await tonConnectUI.sendTransaction(tx as any);
      setTimeout(() => refreshData(), 2000);
      return true;
    },
    [sdk, isInitialized, tonConnectUI, refreshData]
  );

  const stakeMax = useCallback(async () => {
    if (!sdk || !isInitialized || !sdk.ready) {
      throw new Error("SDK not ready");
    }

    const tx = await sdk.stakeMax();
    if (!tx) throw new Error("Failed to prepare transaction");

    await tonConnectUI.sendTransaction(tx as any);
    setTimeout(() => refreshData(), 2000);
    return true;
  }, [sdk, isInitialized, tonConnectUI, refreshData]);

  const unstake = useCallback(
    async (amount: string) => {
      if (!sdk || !isInitialized || !sdk.ready) {
        throw new Error("SDK not ready");
      }

      const tx = await sdk.unstake(BigInt(amount));
      if (!tx) throw new Error("Failed to prepare transaction");

      await tonConnectUI.sendTransaction(tx as any);
      setTimeout(() => refreshData(), 2000);
      return true;
    },
    [sdk, isInitialized, tonConnectUI, refreshData]
  );

  const unstakeInstant = useCallback(
    async (amount: string) => {
      if (!sdk || !isInitialized || !sdk.ready) {
        throw new Error("SDK not ready");
      }

      const tx = await sdk.unstakeInstant(BigInt(amount));
      if (!tx) throw new Error("Failed to prepare transaction");

      await tonConnectUI.sendTransaction(tx as any);
      setTimeout(() => refreshData(), 2000);
      return true;
    },
    [sdk, isInitialized, tonConnectUI, refreshData]
  );

  const unstakeBestRate = useCallback(
    async (amount: string) => {
      if (!sdk || !isInitialized || !sdk.ready) {
        throw new Error("SDK not ready");
      }

      const tx = await sdk.unstakeBestRate(BigInt(amount));
      if (!tx) throw new Error("Failed to prepare transaction");

      await tonConnectUI.sendTransaction(tx as any);
      setTimeout(() => refreshData(), 2000);
      return true;
    },
    [sdk, isInitialized, tonConnectUI, refreshData]
  );

  return {
    isConnected: !!userAddress,
    isInitialized: isInitialized && (sdk?.ready ?? false),
    isLoading,
    tonBalance,
    stakedBalance,
    availableBalance,
    tvl,
    stakersCount,
    instantLiquidity,
    currentApy,
    rates,
    withdrawalNFTs,
    stake,
    stakeMax,
    unstake,
    unstakeInstant,
    unstakeBestRate,
    refreshData,
  };
}
