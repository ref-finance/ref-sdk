import React, {
  useEffect,
  useState,
  useContext,
  createContext,
  ReactNode,
} from 'react';
import { ftGetBalance, ftGetTokenMetadata, getGlobalWhitelist } from '../ref';
import {
  EstimateSwapView,
  Pool,
  StablePool,
  TokenMetadata,
  Transaction,
} from '../types';
import { fetchAllPools, getStablePools } from '../pool';
import { estimateSwap, SwapOptions, SwapParams } from '../swap';
import { SwapOutParams } from './types';
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
import { Theme } from './constant';
import { defaultTheme } from './constant';
import {
  getTokenPriceList,
  getTokens,
  getWhiteListTokensIndexer,
} from '../indexer';
import { toReadableNumber, ONLY_ZEROS } from '../utils';
import { getUserRegisteredTokens } from '../ref';

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

  const totalPartialAmountIn = swapTodos.reduce(
    (acc, cur, i) => acc.plus(cur.pool.partialAmountIn || 0),
    new Big(0)
  );

  if (
    tokenInId !== tokenIn.id ||
    tokenOutId !== tokenOut.id ||
    !totalPartialAmountIn.eq(parsedAmountIn)
  ) {
    return false;
  }
  return true;
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

export const useTokensIndexer = ({
  extraTokenList,
  AccountId,
}: {
  extraTokenList?: string[];
  AccountId?: string;
}) => {
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);

  useEffect(() => {
    const userRegister = getUserRegisteredTokens(AccountId);

    userRegister
      .then((list: string[]) => {
        const tokenList = list.concat(extraTokenList || []);
        const tokenListUnique = [...new Set(tokenList)];
        if (tokenListUnique && tokenListUnique.length > 0)
          return Promise.all(tokenListUnique.map(id => ftGetTokenMetadata(id)));
      })
      .then(async tokenList => {
        const whiteList = await getGlobalWhitelist();

        const globalWhiteListTokens = (await getWhiteListTokensIndexer(
          whiteList
        )) as TokenMetadata[];

        if (!!tokenList) {
          const tokenListMap = tokenList.concat(globalWhiteListTokens).reduce(
            (acc, cur, i) => ({
              ...acc,
              [cur.id]: cur,
            }),
            {}
          );

          return Object.values(tokenListMap) as TokenMetadata[];
        }

        return Object.values(globalWhiteListTokens).filter(
          token => !!token
        ) as TokenMetadata[];
      })
      .then(setTokens);
  }, [AccountId, extraTokenList]);

  return tokens;
};

export const useAllTokensIndexer = () => {
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

  const [isEstimating, setIsEstimating] = useState<boolean>(false);

  const [forceEstimate, setForceEstimate] = useState<boolean>(false);

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
    params.tokenIn,
    params.tokenOut,
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
