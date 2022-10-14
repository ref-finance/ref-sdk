import React, {
  useEffect,
  useState,
  useContext,
  createContext,
  ReactNode,
} from 'react';
import {
  ftGetBalance,
  ftGetTokenMetadata,
  getGlobalWhitelist,
  getUserRegisteredTokens,
} from '../ref';
import {
  EstimateSwapView,
  Pool,
  StablePool,
  TokenMetadata,
  Transaction,
} from '../types';
import { fetchAllPools, getStablePools } from '../pool';
import { estimateSwap, SwapOptions, SwapParams } from '../swap';
import { SwapOutParams, Theme } from './types';
import {
  percentLess,
  separateRoutes,
  toNonDivisibleNumber,
  calculateExchangeRate,
  getAvgFee,
} from '../utils';
import Big from 'big.js';
import { instantSwap } from '../instantSwap';

import { getExpectedOutputFromActionsORIG } from '../smartRoutingLogic.js';
import { defaultTheme } from '../constant';
import { getTokenPriceList, getTokens } from '../indexer';
import { toReadableNumber, ONLY_ZEROS } from '../utils';

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

export const useTokens = (
  extraTokenList: string[] | TokenMetadata[] = [],
  AccountId: string = ''
) => {
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);

  const extraList = (extraTokenList.length > 0 &&
  typeof extraTokenList[0] === 'string'
    ? extraTokenList
    : []) as string[];

  useEffect(() => {
    Promise.all([getGlobalWhitelist(), getUserRegisteredTokens(AccountId)])
      .then(res => {
        return [...new Set<string>(res.flat().concat(extraList))];
      })
      .then(tokenIds =>
        Promise.all<TokenMetadata>(
          tokenIds.map(id => ftGetTokenMetadata(id))
        ).then(setTokens)
      );
  }, [extraList.join('-')]);

  return tokens.concat(
    extraList.length === 0 ? [] : (extraTokenList as TokenMetadata[])
  );
};

export const useTokensIndexer = () => {
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);

  useEffect(() => {
    getTokens().then((tokensView: any) => {
      setTokens(Object.values(tokensView));
    });
  }, []);

  return tokens;
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

    fetchAllPools().then(setAllPools);
  }, [refreshTrigger]);

  useEffect(() => {
    if (allPools.ratedPools.length === 0 || allPools.unRatedPools.length === 0)
      return;

    const pools: Pool[] = allPools.unRatedPools.concat(allPools.ratedPools);

    getStablePools(pools)
      .then(setAllStablePools)
      .finally(() => {
        setPoolFetchingState('end');
      });
  }, [
    allPools.ratedPools.map(p => p.id).join('-'),
    allPools.unRatedPools.map(p => p.id).join('-'),
    refreshTrigger,
  ]);

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
    onSwap: (transactionsRef: Transaction[]) => void;
    AccountId?: string;
    poolFetchingState?: 'loading' | 'end';
  }
): SwapOutParams => {
  const {
    slippageTolerance,
    refreshTrigger,
    onSwap,
    AccountId,
    poolFetchingState,
    ...swapParams
  } = params;

  const [estimates, setEstimates] = useState<EstimateSwapView[]>([]);

  const [canSwap, setCanSwap] = useState(false);

  const [swapError, setSwapError] = useState<Error | null>(null);

  const [amountOut, setAmountOut] = useState<string>('');

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
    if (!params.tokenIn || !params.tokenOut) return;

    const transactionsRef = await instantSwap({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      swapTodos: estimates,
      slippageTolerance,
      AccountId: AccountId || '',
    });

    onSwap(transactionsRef);
  };

  useEffect(() => {
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
      return;
    }

    setSwapError(null);

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

        const expectAmountOut = getExpectedOutputFromActionsORIG(
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
      });
  }, [
    params.amountIn,
    params.tokenIn,
    params.tokenOut,
    refreshTrigger,
    poolFetchingState,
  ]);

  return {
    amountOut,
    minAmountOut,
    fee,
    rate,
    estimates,
    makeSwap,
    canSwap,
    swapError,
    setAmountOut,
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

export const useTokenBalnces = (tokens: TokenMetadata[], AccountId: string) => {
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    const validTokens = tokens.filter(t => !!t?.id);

    const ids = validTokens.map(token => token.id);

    Promise.all(ids.map(id => ftGetBalance(id, AccountId))).then(balances => {
      const balancesMap = validTokens.reduce((acc, token, index) => {
        return {
          ...acc,
          [token.id]: toReadableNumber(token.decimals, balances[index]),
        };
      }, {});

      setBalances(balancesMap);
    });
  }, [tokens.map(t => t?.id).join('-')]);

  return balances;
};
