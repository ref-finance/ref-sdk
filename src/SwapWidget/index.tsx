import React, { useEffect, useMemo, useState } from 'react';

import { SwapWidgetProps } from './types';
import { TokenMetadata } from '../types';
import {
  useTokens,
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
import { useTokenPriceList, useTokenBalnces, useTokensIndexer } from './state';

import { CgArrowsExchangeAltV } from '@react-icons/all-files/cg/CgArrowsExchangeAltV';
import { RefIcon } from './components';
import Big from 'big.js';
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
  const [tokenInBalance, setTokenInBalance] = useState<string>('');

  const [tokenOutBalance, setTokenOutBalance] = useState<string>('');

  const [notOpen, setNotOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!transactionState) return;

    if (transactionState && transactionState.state !== null) {
      setNotOpen(true);
    }
    transactionState?.setState(transactionState?.state || null);
  }, [transactionState]);

  const [widgetRoute, setWidgetRoute] = useState<
    'swap' | 'token-selector-in' | 'token-selector-out'
  >('swap');

  const [amountIn, setAmountIn] = useState<string>('1');

  const [showSlip, setShowSlip] = useState<boolean>(false);

  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);

  const tokens = useTokensIndexer({ defaultTokenList, AccountId });

  // cache list tokens
  useAllTokens({ reload: true });

  const balances = useTokenBalnces(tokens, AccountId);

  const [refreshTrigger, setRreshTrigger] = useState<boolean>(false);

  const tokenPriceList = useTokenPriceList();

  const { allPools, allStablePools, poolFetchingState } = useRefPools(
    refreshTrigger
  );

  const [hoverAccount, setHoverAccount] = useState<boolean>(false);

  useEffect(() => {
    const defaultIn =
      STORAGED_TOKEN_IN || defaultTokenIn || WRAP_NEAR_CONTRACT_ID;

    const defaultOut = STORAGED_TOKEN_OUT || defaultTokenOut || REF_TOKEN_ID;

    if (defaultIn) {
      if (defaultIn === WRAP_NEAR_CONTRACT_ID || defaultIn === 'NEAR') {
        handleSetTokenIn({
          ...NEAR_META_DATA,
          id: WRAP_NEAR_CONTRACT_ID,
        });
      } else {
        ftGetTokenMetadata(defaultIn).then(handleSetTokenIn);
      }
    }
    if (defaultOut) {
      if (defaultOut === WRAP_NEAR_CONTRACT_ID || defaultOut === 'NEAR') {
        handleSetTokenOut({
          ...NEAR_META_DATA,
          id: WRAP_NEAR_CONTRACT_ID,
        });
      } else {
        ftGetTokenMetadata(defaultOut).then(handleSetTokenOut);
      }
    }
  }, [defaultTokenIn, defaultTokenOut, STORAGED_TOKEN_IN, STORAGED_TOKEN_OUT]);

  useEffect(() => {
    if (!tokenIn) return;

    ftGetBalance(
      tokenIn.id === WRAP_NEAR_CONTRACT_ID ? 'NEAR' : tokenIn.id,
      AccountId
    ).then(available => {
      setTokenInBalance(toReadableNumber(tokenIn.decimals, available));
    });
  }, [tokenIn, AccountId]);

  useEffect(() => {
    if (!tokenOut) return;
    ftGetBalance(
      tokenOut.id === WRAP_NEAR_CONTRACT_ID ? 'NEAR' : tokenOut.id,
      AccountId
    ).then(available => {
      setTokenOutBalance(toReadableNumber(tokenOut.decimals, available));
    });
  }, [tokenOut, AccountId]);

  const {
    amountOut,
    minAmountOut,
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
    simplePools: allPools.simplePools,
    options: {
      enableSmartRouting,
      stablePools: allPools.ratedPools.concat(allPools.unRatedPools),
      stablePoolsDetail: allStablePools,
    },
    slippageTolerance,
    onSwap,
    AccountId,
    refreshTrigger,
    poolFetchingState,
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

    setNotOpen(true);
    makeSwap();
  };

  const canSubmit =
    tokenIn &&
    tokenOut &&
    canSwap &&
    !swapError &&
    isSignedIn &&
    new Big(tokenInBalance).gte(amountIn || '0');

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
                {!AccountId ? null : (
                  <div
                    className="__ref-swap-widget-header-button-account __ref-swap-widget-row-flex-center"
                    style={{
                      color: primary,
                      background: hoverAccount
                        ? 'rgba(255,104,158,0.2)'
                        : secondaryBg,
                      border: `1px solid ${borderColor}`,
                      cursor: 'pointer',
                    }}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      hoverAccount && onDisConnect();
                    }}
                    onMouseEnter={() => setHoverAccount(true)}
                    onMouseLeave={() => setHoverAccount(false)}
                  >
                    {hoverAccount ? 'Diconnect' : getAccountName(AccountId)}
                  </div>
                )}

                <Slider showSlip={showSlip} setShowSlip={setShowSlip} />

                <SlippageSelector
                  slippageTolerance={slippageTolerance}
                  onChangeSlippageTolerance={setSlippageTolerance}
                  showSlip={showSlip}
                  setShowSlip={setShowSlip}
                />
              </div>
            </div>

            <TokenAmount
              amount={amountIn}
              balance={tokenInBalance}
              token={tokenIn}
              price={!tokenIn ? null : tokenPriceList?.[tokenIn.id]?.price}
              onChangeAmount={setAmountIn}
              onSelectToken={() => {
                setWidgetRoute('token-selector-in');
              }}
            />

            <div
              className="__ref-swap-widget-exchange-button __ref-swap-widget-row-flex-center"
              style={{
                color: iconDefault,
              }}
            >
              <CgArrowsExchangeAltV
                style={{
                  cursor: 'pointer',
                }}
                className="__ref-swap-widget-exchange-button-icon"
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
                setWidgetRoute('token-selector-out');
              }}
              onForceUpdate={() => {
                setRreshTrigger(!refreshTrigger);
              }}
              poolFetchingState={poolFetchingState}
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
                {'Swap'}
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

            <Notification
              state={transactionState?.state}
              setState={transactionState?.setState}
              open={notOpen}
              setOpen={setNotOpen}
              tx={transactionState?.tx}
              detail={transactionState?.detail}
            />
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
