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
import { estimateSwap, SwapParams } from '../swap';
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
import { getTokenPriceList } from '../indexer';
import { toReadableNumber } from '../utils';

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

export const useTokens = (tokenList: string[] = [], AccountId: string = '') => {
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);

  useEffect(() => {
    Promise.all([getGlobalWhitelist(), getUserRegisteredTokens(AccountId)])
      .then(res => {
        return [...new Set<string>(res.flat().concat(tokenList))];
      })
      .then(tokenIds =>
        Promise.all<TokenMetadata>(
          tokenIds.map(id => ftGetTokenMetadata(id))
        ).then(setTokens)
      );
  }, [tokenList.join('-')]);

  return tokens;
};

export const useRefPools = () => {
  const [allPools, setAllPools] = useState<{
    simplePools: Pool[];
    ratedPools: Pool[];
    unRatedPools: Pool[];
  }>({
    simplePools: [],
    ratedPools: [],
    unRatedPools: [],
  });

  const [allStablePools, setAllStablePools] = useState<StablePool[]>([]);

  useEffect(() => {
    fetchAllPools().then(setAllPools);
  }, []);

  useEffect(() => {
    if (allPools.ratedPools.length === 0 || allPools.unRatedPools.length === 0)
      return;

    const pools: Pool[] = allPools.unRatedPools.concat(allPools.ratedPools);

    getStablePools(pools).then(setAllStablePools);
  }, [
    allPools.ratedPools.map(p => p.id).join('-'),
    allPools.unRatedPools.map(p => p.id).join('-'),
  ]);

  return {
    allPools,
    allStablePools,
    success: allStablePools.length > 0 && allPools.simplePools.length > 0,
  };
};

export const useSwap = (
  params: SwapParams & {
    slippageTolerance: number;
    refreshTrigger: boolean;
    onSwap: (transactionsRef: Transaction[]) => void;
    AccountId?: string;
  }
): SwapOutParams => {
  const {
    slippageTolerance,
    refreshTrigger,
    onSwap,
    AccountId,
    ...swapParams
  } = params;

  const [estimates, setEstimates] = useState<EstimateSwapView[]>([]);

  const [canSwap, setCanSwap] = useState(false);

  const [swapError, setSwapError] = useState<Error | null>(null);

  const [amountOut, setAmountOut] = useState<string>('');

  const minAmountOut = amountOut
    ? percentLess(slippageTolerance, amountOut)
    : '';

  const fee = getAvgFee(
    estimates,
    params.tokenOut.id,
    toNonDivisibleNumber(params.tokenIn.decimals, params.amountIn)
  );

  const rate = calculateExchangeRate(params.amountIn, amountOut);

  const makeSwap = async () => {
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
    if (!params.tokenIn || !params.tokenOut) return;
    setCanSwap(false);
    estimateSwap(swapParams)
      .then(estimates => {
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
      });
  }, [
    params.amountIn,
    params.tokenIn,
    params.tokenOut,
    slippageTolerance,
    refreshTrigger,
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
  const [balanes, setBalances] = useState<Record<string, string>>({});

  const validTokens = tokens.filter(t => !!t?.id);

  useEffect(() => {
    if (!validTokens || validTokens.length === 0) return;

    const ids = validTokens.map(token => token.id).filter(id => !id);

    Promise.all(ids.map(id => ftGetBalance(id, AccountId))).then(balances => {
      const balancesMap = validTokens.reduce((acc, token, index) => {
        acc[token.id] = toReadableNumber(token.decimals, balances[index]);
        return acc;
      }, balanes);

      setBalances(balancesMap);
    });

    if (ids.length === 0) return;
  }, [validTokens?.map(t => t?.id || '').join('-')]);

  return balanes;
};
