import React, { useEffect, useState } from 'react';

import { SwapWidgetProps } from './types';
import { TokenMetadata } from '../types';
import {
  useTokens,
  useRefPools,
  useSwap,
  ThemeContextProvider,
  TokenPriceContextProvider,
} from './state';
import {
  REF_TOKEN_ID,
  REF_META_DATA,
  WNEAR_META_DATA,
  defaultTheme,
} from '../constant';
import { ftGetBalance } from '../ref';
import { getAccountName, toReadableNumber, toPrecision } from '../utils';
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
import { useTokenPriceList, useTokensIndexer, useTokenBalnces } from './state';

import { CgArrowsExchangeAltV } from '@react-icons/all-files/cg/CgArrowsExchangeAltV';
import { RefIcon } from './components';
import Big from 'big.js';

const SwapWidget = (props: SwapWidgetProps) => {
  const {
    theme,
    extraTokenList,
    onSwap,
    connection,
    width,
    height,
    enableSmartRouting,
    className,
    transactionState,
    onConnect,
  } = props;

  const curTheme = theme || defaultTheme;

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
  } = curTheme;

  const { AccountId, isSignedIn: isSignedInProp } = connection;

  const isSignedIn = !!AccountId && isSignedInProp;

  const [tokenIn, setTokenIn] = useState<TokenMetadata>();

  const [tokenOut, setTokenOut] = useState<TokenMetadata>();
  const [tokenInBalance, setTokenInBalance] = useState<string>('');

  const [tokenOutBalance, setTokenOutBalance] = useState<string>('');

  const [swapState, setSwapState] = useState<
    'pending' | 'success' | 'fail' | null
  >(null);

  const [notOpen, setNotOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!!transactionState?.state) {
      setNotOpen(true);
    }
    setSwapState(transactionState?.state || null);
  }, [transactionState]);

  const [widgetRoute, setWidgetRoute] = useState<
    'swap' | 'token-selector-in' | 'token-selector-out'
  >('swap');

  const [amountIn, setAmountIn] = useState<string>('1');

  const [showSlip, setShowSlip] = useState<boolean>(false);

  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);

  const tokens = useTokens(extraTokenList);

  const balances = useTokenBalnces(tokens, AccountId);

  const [refreshTrigger, setRreshTrigger] = useState<boolean>(false);

  const tokenPriceList = useTokenPriceList();

  const { allPools, allStablePools, poolFetchingState } = useRefPools(
    refreshTrigger
  );

  useEffect(() => {
    if (!tokenIn) return;
    ftGetBalance(tokenIn.id, AccountId).then(available => {
      setTokenInBalance(toReadableNumber(tokenIn.decimals, available));
    });
  }, [tokenIn]);

  useEffect(() => {
    if (!tokenOut) return;
    ftGetBalance(tokenOut.id, AccountId).then(available => {
      setTokenOutBalance(toReadableNumber(tokenOut.decimals, available));
    });
  }, [tokenOut]);

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isSignedIn) {
      onConnect();

      return;
    } else {
      setSwapState('pending');
      setNotOpen(true);
      makeSwap();
    }
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
                      background: secondaryBg,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <span
                      style={{
                        paddingRight: '2px',
                      }}
                    >
                      {getAccountName(AccountId)}
                    </span>

                    <FiChevronDown />
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
                setTokenIn(tokenIn);
              }}
            />

            <div className="__ref-swap-widget-exchange-button __ref-swap-widget-row-flex-center">
              <CgArrowsExchangeAltV
                style={{
                  cursor: 'pointer',
                  color: iconDefault,
                }}
                size={30}
                onClick={() => {
                  setTokenIn(tokenOut);
                  setTokenOut(tokenIn);
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
                setTokenOut(tokenOut);
              }}
              onForceUpdate={() => {
                setRreshTrigger(!refreshTrigger);
              }}
            />
            {canSwap && !swapError && (
              <DetailView
                fee={fee}
                rate={rate}
                amountIn={amountIn}
                minReceived={minAmountOut}
                tokenIn={tokenIn}
                tokenOut={tokenOut}
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

            <button
              type="submit"
              className="__ref-swap-widget-submit-button __ref-swap-widget-button"
              style={{
                color: container,
                background: buttonBg,
                opacity: !canSubmit ? 0.5 : 1,
              }}
              disabled={!canSubmit}
            >
              {isSignedIn ? 'Swap' : 'Connect Wallet'}
            </button>

            <div
              className="__ref-swap-widget-row-flex-center"
              style={{
                color: secondary,
                justifyContent: 'center',
                paddingTop: '12px',
              }}
            >
              <RefIcon />
              &nbsp; Powered by Ref.finance
            </div>

            <Notification
              state={swapState}
              setState={setSwapState}
              amountIn={amountIn}
              amountOut={amountOut}
              tokenIn={tokenIn}
              tokenOut={tokenOut}
              open={notOpen}
              setOpen={setNotOpen}
            />
          </form>
        )}

        {widgetRoute === 'token-selector-in' && (
          <TokenSelector
            balances={balances}
            tokens={tokens}
            width={width}
            onSelect={token => {
              setTokenIn(token);
              setWidgetRoute('swap');
            }}
            onClose={() => setWidgetRoute('swap')}
            AccountId={AccountId}
          />
        )}

        {widgetRoute === 'token-selector-out' && (
          <TokenSelector
            tokens={tokens}
            balances={balances}
            width={width}
            onSelect={token => {
              setTokenOut(token);
              setWidgetRoute('swap');
            }}
            onClose={() => setWidgetRoute('swap')}
            AccountId={AccountId}
          />
        )}
      </TokenPriceContextProvider>
    </ThemeContextProvider>
  );
};

export default SwapWidget;
