import React, {
  useEffect,
  useState,
  useContext,
  createContext,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import {
  ftGetBalance,
  ftGetTokenMetadata,
  getGlobalWhitelist,
  nearDepositTransaction,
  nearWithdrawTransaction,
  REPLACE_TOKENS,
} from '../ref';
import {
  EstimateSwapView,
  Pool,
  StablePool,
  TokenMetadata,
  Transaction,
} from '../types';
import { fetchAllPools, getStablePools } from '../v1-swap/pool';
import { estimateSwap, SwapOptions, SwapParams } from '../v1-swap/swap';
import { ftGetStorageBalance, getMinStorageBalance } from '../ref';
import { SwapOutParams } from './types';
import {
  percentLess,
  separateRoutes,
  toNonDivisibleNumber,
  calculateExchangeRate,
  getAvgFee,
} from '../utils';
import Big from 'big.js';
import { instantSwap } from '../v1-swap/instantSwap';

import { getExpectedOutputFromActionsORIG } from '../v1-swap/smartRoutingLogic.js';
import { Theme } from './constant';
import { defaultTheme } from './constant';
import {
  getTokenPriceList,
  getTokens,
  getWhiteListTokensIndexer,
} from '../indexer';
import {
  toReadableNumber,
  ONLY_ZEROS,
  getExpectedOutputFromSwapTodos,
} from '../utils';
import { getUserRegisteredTokens } from '../ref';
import { WRAP_NEAR_CONTRACT_ID, NEAR_META_DATA } from '../constant';
import { scientificNotationToString } from '../utils';
import metaIconDefaults from '../metaIcons';
import {
  formatNearAmount,
  parseNearAmount,
} from 'near-api-js/lib/utils/format';

export const ThemeContext = createContext<Theme>(defaultTheme);

export const ThemeContextProvider: React.FC<{
  customTheme: Theme | undefined;
}> = ({ customTheme, children }) => {
  const [theme, setTheme] = useState<Theme>(customTheme || defaultTheme);

  useEffect(() => {
    if (!customTheme) return;
    setTheme(customTheme);
  }, [customTheme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};

export const estimateValidator = (
  swapTodos: EstimateSwapView[],
  tokenIn: TokenMetadata,
  parsedAmountIn: string,
  tokenOut: TokenMetadata
) => {
  const tokenInId = swapTodos[0]?.inputToken;
  const tokenOutId = swapTodos[swapTodos.length - 1]?.outputToken;

  const totalPartialAmountIn =
    swapTodos.length === 0
      ? new Big(swapTodos[0].pool.partialAmountIn || 0)
      : swapTodos.reduce(
          (acc, cur, i) => acc.plus(cur.pool.partialAmountIn || 0),
          new Big(0)
        );

  if (
    tokenInId !== tokenIn.id ||
    tokenOutId !== tokenOut.id ||
    !totalPartialAmountIn.eq(parsedAmountIn || '0')
  ) {
    return false;
  }
  return true;
};

export const useAllTokens = ({ reload }: { reload?: boolean }) => {
  const [tokens, setTokens] = useState<Record<string, TokenMetadata>>();
  const [tokensLoading, setTokensLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTokens = async () => {
      const tokens = await getTokens(reload);
      setTokens(tokens);
      setTokensLoading(false);
    };
    fetchTokens();
  }, [reload]);

  return { tokens, tokensLoading };
};

export const useTokensIndexer = ({
  defaultTokenList,
  AccountId,
}: {
  defaultTokenList?: TokenMetadata[];
  AccountId?: string;
}) => {
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);

  const [tokenLoading, setTokenLoading] = useState<boolean>(false);

  useEffect(() => {
    setTokenLoading(true);

    const getTokensList = async () => {
      const whiteList = await getGlobalWhitelist();
      const globalWhiteListTokens = (
        await getWhiteListTokensIndexer(whiteList)
      ).filter(token => !!token) as TokenMetadata[];

      const parsedTokens = globalWhiteListTokens.map(t => {
        return t.id === WRAP_NEAR_CONTRACT_ID
          ? {
              ...NEAR_META_DATA,
              id: t.id,
            }
          : t;
      });

      if (!defaultTokenList || defaultTokenList.length === 0) {
        setTokens(parsedTokens);
        setTokenLoading(false);
      } else {
        const newList = defaultTokenList
          .map(t => {
            return t.id === WRAP_NEAR_CONTRACT_ID
              ? {
                  ...NEAR_META_DATA,
                  id: t.id,
                }
              : t;
          })
          .filter(t => {
            return parsedTokens.findIndex(p => p.id === t.id) !== -1;
          });
        setTokens(
          newList.map(t =>
            !t.icon || REPLACE_TOKENS.includes(t.id)
              ? {
                  ...t,
                  icon: metaIconDefaults[t.id],
                }
              : t
          )
        );
        setTokenLoading(false);
      }
    };

    getTokensList();
  }, [AccountId, defaultTokenList]);

  return { tokens, tokenLoading };
};

export const useRefPools = (refreshTrigger: boolean) => {
  const [allPools, setAllPools] = useState<{
    simplePools: Pool[];
    ratedPools: Pool[];
    unRatedPools: Pool[];
  }>({
    simplePools: [],
    ratedPools: [],
    unRatedPools: [],
  });

  const [poolFetchingState, setPoolFetchingState] = useState<'loading' | 'end'>(
    'loading'
  );

  const [allStablePools, setAllStablePools] = useState<StablePool[]>([]);

  useEffect(() => {
    setPoolFetchingState('loading');

    fetchAllPools()
      .then(allPools => {
        setAllPools(allPools);

        return allPools;
      })
      .then(allPools => {
        const pools: Pool[] = allPools.unRatedPools.concat(allPools.ratedPools);

        return getStablePools(pools).then(setAllStablePools);
      })
      .finally(() => {
        setPoolFetchingState('end');
      });
  }, [refreshTrigger]);

  return {
    allPools,
    allStablePools,
    poolFetchingState,
  };
};

export const useSwap = (
  params: {
    tokenIn?: TokenMetadata;
    tokenOut?: TokenMetadata;
    amountIn: string;
    simplePools: Pool[];
    options?: SwapOptions;
  } & {
    slippageTolerance: number;
    refreshTrigger: boolean;
    onSwap: (transactionsRef: Transaction[]) => Promise<void>;
    AccountId?: string;
    poolFetchingState?: 'loading' | 'end';
    referralId?: string;
    tokens: TokenMetadata[];
  }
): SwapOutParams => {
  const {
    slippageTolerance,
    refreshTrigger,
    onSwap,
    AccountId,
    poolFetchingState,
    referralId,
    tokens,
  } = params;

  const { tokenIn, tokenOut, amountIn } = params;

  const [estimates, setEstimates] = useState<EstimateSwapView[]>([]);

  const [canSwap, setCanSwap] = useState(false);

  const [swapError, setSwapError] = useState<Error | null>(null);

  const [amountOut, setAmountOut] = useState<string>('');

  const [isEstimating, setIsEstimating] = useState<boolean>(false);

  const [forceEstimate, setForceEstimate] = useState<boolean>(false);

  const { balances, updateTokenBalance } = useTokenBalances(tokens, AccountId);

  const tokenInBalance = useMemo(() => balances[tokenIn?.id!], [
    tokenIn,
    balances,
  ]);

  const tokenOutBalance = useMemo(() => balances[tokenOut?.id!] || '', [
    tokenOut,
    balances,
  ]);

  const minAmountOut = amountOut
    ? percentLess(slippageTolerance, amountOut)
    : '';

  const fee =
    !params.tokenOut || !params.tokenIn
      ? 0
      : getAvgFee(
          estimates,
          params.tokenOut.id,
          toNonDivisibleNumber(params.tokenIn.decimals, params.amountIn)
        );

  const rate = calculateExchangeRate(
    ONLY_ZEROS.test(params.amountIn) ? '1' : params.amountIn,
    amountOut || '1'
  );

  const makeSwap = async () => {
    if (!params.tokenIn || !params.tokenOut || !AccountId) return;

    const transactionsRef = await instantSwap({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      swapTodos: estimates,
      slippageTolerance,
      AccountId: AccountId,
      referralId,
    });
    if (tokenIn && tokenIn.id === WRAP_NEAR_CONTRACT_ID) {
      const tokenRegistered = await ftGetStorageBalance(tokenIn.id, AccountId);

      let nearDepositAmount = amountIn;
      if (tokenRegistered === null) {
        const minStorageBalance = await getMinStorageBalance(tokenIn.id);
        nearDepositAmount = formatNearAmount(
          String(
            BigInt(parseNearAmount(nearDepositAmount)!) +
              BigInt(minStorageBalance)
          )
        );
      }

      transactionsRef.splice(-1, 0, nearDepositTransaction(nearDepositAmount));
    }
    if (tokenOut && tokenOut.id === WRAP_NEAR_CONTRACT_ID) {
      let outEstimate = new Big(0);
      const routes = separateRoutes(estimates, tokenOut.id);

      const bigEstimate = routes.reduce((acc, cur) => {
        const curEstimate = cur[cur.length - 1].estimate;
        return acc.plus(curEstimate);
      }, outEstimate);

      const minAmountOut = percentLess(
        slippageTolerance,

        scientificNotationToString(bigEstimate.toString())
      );

      transactionsRef.push(nearWithdrawTransaction(minAmountOut));
    }

    await onSwap(transactionsRef);

    setTimeout(() => {
      const tokensToUpdate = [];
      if (tokenIn) tokensToUpdate.push(tokenIn.id);
      if (tokenOut) tokensToUpdate.push(tokenOut.id);
      if (tokensToUpdate.length > 0 && AccountId)
        updateTokenBalance(tokensToUpdate, AccountId);
    }, 3000);
  };

  const getEstimate = () => {
    if (
      !params.tokenIn ||
      !params.tokenOut ||
      poolFetchingState === 'loading'
    ) {
      setCanSwap(false);
      return;
    }
    setCanSwap(false);

    if (
      ONLY_ZEROS.test(params.amountIn) ||
      !params.tokenOut ||
      !params.tokenIn
    ) {
      setAmountOut('');
      setEstimates([]);
      return;
    }

    setSwapError(null);
    setIsEstimating(true);
    estimateSwap({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      simplePools: params.simplePools,
      options: params.options,
    })
      .then(estimates => {
        if (
          ONLY_ZEROS.test(params.amountIn) ||
          !params.tokenOut ||
          !params.tokenIn
        ) {
          setAmountOut('');
          return;
        }
        setSwapError(null);

        const expectAmountOut = getExpectedOutputFromSwapTodos(
          estimates,
          params.tokenOut.id
        ).toString();

        setAmountOut(expectAmountOut);

        setEstimates(estimates);
        setCanSwap(true);
      })
      .catch(e => {
        setSwapError(e);
        setCanSwap(false);
        setAmountOut('');
      })
      .finally(() => {
        setIsEstimating(false);
        setForceEstimate(false);
      });
  };

  useEffect(() => {
    const estimateValidationPass =
      estimates.length > 0 &&
      params.tokenIn &&
      params.tokenOut &&
      estimateValidator(
        estimates,
        params.tokenIn,
        toNonDivisibleNumber(params.tokenIn.decimals, params.amountIn),
        params.tokenOut
      );

    if (isEstimating && estimates && !forceEstimate) return;
    if ((estimateValidationPass || swapError) && !forceEstimate) return;
    getEstimate();
  }, [
    params.amountIn,
    params.tokenIn?.id,
    params.tokenOut?.id,
    refreshTrigger,
    poolFetchingState,
    isEstimating,
    forceEstimate,
  ]);

  useEffect(() => {
    // setEstimating(false);

    setForceEstimate(true);
  }, [
    params.tokenIn?.id,
    params.tokenOut?.id,
    params.options?.enableSmartRouting,
  ]);

  return {
    amountOut,
    minAmountOut,
    balances,
    tokenInBalance,
    tokenOutBalance,
    fee,
    rate,
    estimates,
    makeSwap,
    canSwap,
    swapError,
    setAmountOut,
    isEstimating,
  };
};

export const TokenPriceContext = createContext<Record<string, any> | null>(
  null
);

export const useTokenPriceList = () => {
  const [tokenPriceList, setTokenPriceList] = useState<Record<string, any>>({});

  useEffect(() => {
    getTokenPriceList().then(setTokenPriceList);
  }, []);

  return tokenPriceList;
};

export const TokenPriceContextProvider: React.FC = ({ children }) => {
  const tokenPriceList = useTokenPriceList();

  return (
    <TokenPriceContext.Provider value={tokenPriceList}>
      {children}
    </TokenPriceContext.Provider>
  );
};

type BalancesMap = Record<string, string>;

export const useTokenBalances = (
  tokens: TokenMetadata[],
  AccountId?: string
) => {
  const [balances, setBalances] = useState<BalancesMap>({});

  const updateTokenBalance = useCallback(
    async (tokenIds: string[], AccountId: string) => {
      const updatedTokensBalancesMap: BalancesMap = {};
      await Promise.all(
        tokenIds.map(async tokenId => {
          updatedTokensBalancesMap[tokenId] = toReadableNumber(
            tokens.find(t => t.id === tokenId)?.decimals || 0,
            await ftGetBalance(
              tokenId === WRAP_NEAR_CONTRACT_ID ? 'NEAR' : tokenId,
              AccountId
            )
          );
        })
      );
      setBalances(prevState => ({ ...prevState, ...updatedTokensBalancesMap }));
    },
    [tokens]
  );

  useEffect(() => {
    // Initializes token balances
    // Called in 15 seconds intervals
    const initTokenBalances = async () => {
      if (!AccountId) {
        setBalances({});
        return;
      }

      const validTokens = tokens.filter(t => !!t?.id);
      const ids = validTokens.map(token => token.id);

      updateTokenBalance(ids, AccountId);
    };

    initTokenBalances();
    const interval = setInterval(initTokenBalances, 15_000);
    return () => clearInterval(interval);
  }, [AccountId, tokens.map(t => t?.id).join('-')]);

  return { balances, updateTokenBalance };
};
