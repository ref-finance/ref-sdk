import React, { useEffect, useMemo, useState } from 'react';

import { SwapWidgetProps } from './types';
import { TokenMetadata } from '../types';
import {
  useRefPools,
  useSwap,
  ThemeContextProvider,
  TokenPriceContextProvider,
  useAllTokens,
} from './state';
import { ftGetBalance, ftGetTokenMetadata } from '../ref';
import {
  getAccountName,
  toReadableNumber,
  toPrecision,
  getPriceImpact,
  isMobile,
  isValidSlippageTolerance,
} from '../utils';
import {
  Slider,
  SlippageSelector,
  TokenSelector,
  TokenAmount,
  DetailView,
  Notification,
} from './components';
import { FiChevronDown } from '@react-icons/all-files/fi/FiChevronDown';

import { TiWarning } from '@react-icons/all-files/ti/TiWarning';

import './style.css';
import { useTokenPriceList, useTokenBalances, useTokensIndexer } from './state';

import { CgArrowsExchangeAltV } from '@react-icons/all-files/cg/CgArrowsExchangeAltV';
import { RefIcon, AccountButton } from './components';
import Big from 'big.js';
import { ONLY_ZEROS } from '../utils';
import {
  defaultTheme,
  defaultDarkModeTheme,
  REF_WIDGET_SWAP_IN_KEY,
  REF_WIDGET_SWAP_OUT_KEY,
} from './constant';
import {
  WRAP_NEAR_CONTRACT_ID,
  NEAR_META_DATA,
  REF_TOKEN_ID,
  REF_META_DATA,
  DEFAULT_SLIPPAGE_TOLERANCE,
} from '../constant';

export const SwapWidget = (props: SwapWidgetProps) => {
  const {
    theme,
    defaultTokenList,
    onSwap,
    connection,
    width,
    height,
    enableSmartRouting,
    className,
    transactionState,
    onConnect,
    defaultTokenIn,
    defaultTokenOut,
    onDisConnect,
    darkMode,
    referralId,
    minNearAmountLeftForGasFees = 0.5,
  } = props;

  const curTheme = theme || (darkMode ? defaultDarkModeTheme : defaultTheme);

  const STORAGED_TOKEN_IN = localStorage.getItem(REF_WIDGET_SWAP_IN_KEY);

  const STORAGED_TOKEN_OUT = localStorage.getItem(REF_WIDGET_SWAP_OUT_KEY);

  const {
    container,
    buttonBg,
    primary,
    secondary,
    borderRadius,
    fontFamily,
    hover,
    active,
    secondaryBg,
    borderColor,
    iconDefault,
    iconHover,
    refIcon,
  } = curTheme;

  const { AccountId, isSignedIn: isSignedInProp } = connection;

  const isSignedIn = !!AccountId && isSignedInProp;

  const [tokenIn, setTokenIn] = useState<TokenMetadata>();

  const handleSetTokenIn = (token: TokenMetadata) => {
    setTokenIn(token);
    localStorage.setItem(REF_WIDGET_SWAP_IN_KEY, token.id);
  };

  const handleSetTokenOut = (token: TokenMetadata) => {
    setTokenOut(token);
    localStorage.setItem(REF_WIDGET_SWAP_OUT_KEY, token.id);
  };

  const [tokenOut, setTokenOut] = useState<TokenMetadata>();

  const [widgetRoute, setWidgetRoute] = useState<
    'swap' | 'token-selector-in' | 'token-selector-out'
  >('swap');

  const [amountIn, setAmountIn] = useState<string>('1');

  const [showSlip, setShowSlip] = useState<boolean>(false);

  const [slippageTolerance, setSlippageTolerance] = useState<string>(
    DEFAULT_SLIPPAGE_TOLERANCE
  );

  const formattedSlippageTolerance = useMemo(() => {
    try {
      const formatted = Number(slippageTolerance);
      if (Number.isNaN(formatted) || !isValidSlippageTolerance(formatted))
        return +DEFAULT_SLIPPAGE_TOLERANCE;
      return formatted;
    } catch {
      return +DEFAULT_SLIPPAGE_TOLERANCE;
    }
  }, [slippageTolerance]);

  const { tokens, tokenLoading } = useTokensIndexer({
    defaultTokenList,
    AccountId,
  });

  // cache list tokens
  useAllTokens({ reload: true });

  const [refreshTrigger, setRreshTrigger] = useState<boolean>(false);

  const tokenPriceList = useTokenPriceList();

  const { allPools, allStablePools, poolFetchingState } = useRefPools(
    refreshTrigger
  );

  useEffect(() => {
    const defaultIn =
      STORAGED_TOKEN_IN || defaultTokenIn || WRAP_NEAR_CONTRACT_ID;

    const defaultOut = STORAGED_TOKEN_OUT || defaultTokenOut || REF_TOKEN_ID;

    if (
      tokens.length > 0 &&
      defaultIn &&
      tokens.findIndex(t => t.id === defaultIn) !== -1
    ) {
      if (defaultIn === WRAP_NEAR_CONTRACT_ID || defaultIn === 'NEAR') {
        handleSetTokenIn({
          ...NEAR_META_DATA,
          id: WRAP_NEAR_CONTRACT_ID,
        });
      } else {
        ftGetTokenMetadata(defaultIn).then(handleSetTokenIn);
      }
    } else if (
      tokens.length > 0 &&
      defaultIn &&
      tokens.findIndex(t => t.id === defaultIn) === -1
    ) {
      handleSetTokenIn({
        ...NEAR_META_DATA,
        id: WRAP_NEAR_CONTRACT_ID,
      });
    }
    if (
      tokens.length > 0 &&
      defaultOut &&
      tokens.findIndex(t => t.id === defaultOut) !== -1
    ) {
      if (defaultOut === WRAP_NEAR_CONTRACT_ID || defaultOut === 'NEAR') {
        handleSetTokenOut({
          ...NEAR_META_DATA,
          id: WRAP_NEAR_CONTRACT_ID,
        });
      } else {
        ftGetTokenMetadata(defaultOut).then(handleSetTokenOut);
      }
    } else if (
      tokens.length > 0 &&
      defaultOut &&
      tokens.findIndex(t => t.id === defaultOut) === -1
    ) {
      handleSetTokenOut(REF_META_DATA);
    }
  }, [tokens, tokenLoading]);

  const {
    amountOut,
    minAmountOut,
    balances,
    tokenInBalance,
    tokenOutBalance,
    rate,
    fee,
    estimates,
    canSwap,
    swapError,
    makeSwap,
    setAmountOut,
  } = useSwap({
    tokenIn: tokenIn,
    tokenOut: tokenOut,
    amountIn,
    simplePools: allPools.simplePools.filter(p => Number(p.shareSupply) > 0),
    options: {
      enableSmartRouting,
      stablePools: allPools.ratedPools
        .concat(allPools.unRatedPools)
        .filter(p => Number(p.shareSupply) > 0),
      stablePoolsDetail: allStablePools.filter(
        p => Number(p.shares_total_supply) > 0
      ),
    },
    slippageTolerance: formattedSlippageTolerance,
    onSwap,
    AccountId,
    refreshTrigger,
    poolFetchingState,
    referralId,
    tokens,
  });

  const priceImpact = useMemo(() => {
    if (!tokenIn || !tokenOut) return '0';

    return getPriceImpact({
      estimates,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      stablePools: allStablePools,
    });
  }, [estimates, tokenIn, tokenOut, amountIn, amountOut, allStablePools]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    transactionState.setState('waitingForConfirmation');
    makeSwap();
  };

  const canSubmit =
    tokenIn &&
    tokenOut &&
    canSwap &&
    !swapError &&
    isSignedIn &&
    new Big(tokenInBalance || '0').gte(amountIn || '0') &&
    isValidSlippageTolerance(formattedSlippageTolerance) &&
    !ONLY_ZEROS.test(tokenInBalance);

  const tokensLoaded = useMemo(() => {
    return tokens.length > 0;
  }, [tokens]);

  return (
    <ThemeContextProvider customTheme={curTheme}>
      <TokenPriceContextProvider>
        {widgetRoute === 'swap' && (
          <form
            className={`__ref-swap-widget-container ${className}`}
            onSubmit={handleSubmit}
            style={{
              background: container,
              fontFamily,
              width,
              height,
            }}
          >
            <div className="__ref-swap-widget-header __ref-swap-widget-row-flex-center">
              <div
                style={{
                  color: primary,
                }}
                className="__ref-swap-widget-header-title"
              >
                Swap
              </div>

              <div
                className="__ref-swap-widget-header-button __ref-swap-widget-row-flex-center"
                style={{
                  position: 'relative',
                }}
              >
                <AccountButton
                  onDisConnect={onDisConnect}
                  AccountId={AccountId}
                />

                <Slider showSlip={showSlip} setShowSlip={setShowSlip} />

                {showSlip && (
                  <SlippageSelector
                    slippageTolerance={slippageTolerance}
                    onChangeSlippageTolerance={setSlippageTolerance}
                    setShowSlip={setShowSlip}
                  />
                )}
              </div>
            </div>

            <TokenAmount
              amount={amountIn}
              balance={tokenInBalance}
              token={tokenIn}
              price={!tokenIn ? null : tokenPriceList?.[tokenIn.id]?.price}
              onChangeAmount={setAmountIn}
              onSelectToken={() => {
                if (!tokensLoaded) return;
                setWidgetRoute('token-selector-in');
              }}
              minNearAmountLeftForGasFees={minNearAmountLeftForGasFees}
            />

            <div
              className={`__ref-swap-widget-exchange-button __ref-swap-widget-row-flex-center `}
              style={{
                color: iconDefault,
              }}
            >
              <CgArrowsExchangeAltV
                style={{
                  cursor: 'pointer',
                }}
                className={`__ref-swap-widget-exchange-button-icon ${
                  isMobile()
                    ? '__ref-swap-widget-active'
                    : '__ref-swap-widget-hover'
                }`}
                size={30}
                onClick={() => {
                  tokenOut && handleSetTokenIn(tokenOut);
                  tokenIn && handleSetTokenOut(tokenIn);
                  setAmountIn('1');
                  setAmountOut('');
                }}
              />
            </div>

            <TokenAmount
              amount={toPrecision(amountOut, 8)}
              balance={tokenOutBalance}
              token={tokenOut}
              price={!tokenOut ? null : tokenPriceList?.[tokenOut.id]?.price}
              onSelectToken={() => {
                if (!tokensLoaded) return;
                setWidgetRoute('token-selector-out');
              }}
              onForceUpdate={() => {
                setRreshTrigger(!refreshTrigger);
              }}
              poolFetchingState={poolFetchingState}
              minNearAmountLeftForGasFees={minNearAmountLeftForGasFees}
            />
            {!swapError && amountIn && amountOut && (
              <DetailView
                fee={fee}
                rate={rate}
                amountIn={amountIn}
                minReceived={minAmountOut}
                tokenIn={tokenIn}
                tokenOut={tokenOut}
                amountOut={amountOut}
                priceImpact={priceImpact}
                estimates={estimates}
              />
            )}

            {swapError && (
              <div
                className="__ref-swap-widget-row-flex-center"
                style={{
                  color: '#DE9450',
                  fontSize: '14px',

                  paddingTop: '16px',
                }}
              >
                <TiWarning fill="#DE9450" size={20} />
                &nbsp;
                {swapError.message}
              </div>
            )}
            {isSignedIn ? (
              <button
                type="submit"
                className="__ref-swap-widget-submit-button __ref-swap-widget-button"
                style={{
                  color: 'white',
                  background: buttonBg,
                  opacity: !canSubmit ? 0.5 : 1,
                  cursor: !canSubmit ? 'not-allowed' : 'pointer',
                }}
                disabled={!canSubmit}
              >
                {tokensLoaded ? (
                  'Swap'
                ) : (
                  <div className="__ref-swap-widget-submit-button-loader"></div>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="__ref-swap-widget-submit-button __ref-swap-widget-button"
                onClick={onConnect}
                style={{
                  color: 'white',
                  background: buttonBg,
                  cursor: 'pointer',
                }}
              >
                {'Connect Wallet'}
              </button>
            )}
            <div
              className="__ref-swap-widget-row-flex-center"
              style={{
                justifyContent: 'center',
              }}
            >
              <a
                className="__ref-swap-widget-row-flex-center"
                style={{
                  color: secondary,
                  justifyContent: 'center',
                  paddingTop: '12px',
                  fontSize: '14px',
                  display: 'inline-flex',
                }}
                href="https://ref.finance"
                target="_blank"
                rel="noreferrer"
              >
                <RefIcon
                  style={{
                    color: refIcon || 'black',
                  }}
                />
                &nbsp; Powered by Ref.finance
              </a>
            </div>

            {transactionState.state !== null && (
              <Notification
                state={transactionState.state}
                setSwapState={transactionState.setState}
                tx={transactionState?.tx}
                detail={transactionState?.detail}
              />
            )}
          </form>
        )}

        {widgetRoute === 'token-selector-in' && (
          <TokenSelector
            balances={balances}
            tokens={tokens}
            width={width}
            onSelect={token => {
              handleSetTokenIn(token);
              setWidgetRoute('swap');
            }}
            onClose={() => setWidgetRoute('swap')}
            AccountId={AccountId}
            className={className}
          />
        )}

        {widgetRoute === 'token-selector-out' && (
          <TokenSelector
            tokens={tokens}
            balances={balances}
            width={width}
            onSelect={token => {
              handleSetTokenOut(token);
              setWidgetRoute('swap');
            }}
            onClose={() => setWidgetRoute('swap')}
            AccountId={AccountId}
            className={className}
          />
        )}
      </TokenPriceContextProvider>
    </ThemeContextProvider>
  );
};
