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
import { getAccountName, toReadableNumber } from '../utils';
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
import { useTokenPriceList } from './state';

import { CgArrowsExchangeAltV } from '@react-icons/all-files/cg/CgArrowsExchangeAltV';
import { RefIcon } from './components';

const SwapWidget = (props: SwapWidgetProps) => {
  const {
    theme,
    tokenList,
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
  } = curTheme;

  const { AccountId, isSignedIn: isSignedInProp } = connection;

  const isSignedIn = !!AccountId && isSignedInProp;

  const [tokenIn, setTokenIn] = useState<TokenMetadata>();

  const [tokenOut, setTokenOut] = useState<TokenMetadata>();

  const [tokenInBalance, setTokenInBalance] = useState<string>('');

  const [tokenOutBalance, setTokenOutBalance] = useState<string>('');

  const [notLoading, setNotLoading] = useState<boolean>(false);

  const [widgetRoute, setWidgetRoute] = useState<
    'swap' | 'token-selector-in' | 'token-selector-out'
  >('swap');

  const [amountIn, setAmountIn] = useState<string>('1');

  const [showSlip, setShowSlip] = useState<boolean>(false);

  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);

  const tokens = useTokens(tokenList);

  const [refreshTrigger, setRreshTrigger] = useState<boolean>(false);

  const tokenPriceList = useTokenPriceList();

  const { allPools, allStablePools, success } = useRefPools();

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
  } = useSwap({
    tokenIn: tokenIn || WNEAR_META_DATA,
    tokenOut: tokenOut || REF_META_DATA,
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
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isSignedIn) {
      onConnect();

      return;
    } else {
      setNotLoading(true);
      makeSwap();
    }
  };

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

                <Slider showSlip={showSlip} />

                <SlippageSelector
                  slippageTolerance={slippageTolerance}
                  onChangeSlippageTolerance={setSlippageTolerance}
                  showSlip={showSlip}
                />
              </div>
            </div>

            <TokenAmount
              amount={amountIn}
              balance={tokenInBalance}
              token={tokenIn}
              price={!tokenIn ? null : tokenPriceList?.[tokenIn.id]}
              onChangeAmount={setAmountIn}
              onSelectToken={() => {
                setWidgetRoute('token-selector-in');
              }}
            />

            <div
              onClick={() => {
                setTokenIn(tokenOut);
                setTokenOut(tokenIn);
                setRreshTrigger(!refreshTrigger);
                setAmountIn('1');
              }}
              className="__ref-swap-widget-exchange-button __ref-swap-widget-row-flex-center"
            >
              <CgArrowsExchangeAltV />
            </div>

            <TokenAmount
              amount={amountOut}
              balance={tokenOutBalance}
              token={tokenOut}
              price={!tokenOut ? null : tokenPriceList?.[tokenOut.id]}
              onSelectToken={() => {
                setWidgetRoute('token-selector-out');
              }}
            />

            <DetailView
              fee={fee}
              rate={rate}
              amountIn={amountIn}
              minReceived={minAmountOut}
              tokenIn={tokenIn}
              tokenOut={tokenOut}
            />

            {swapError && (
              <div className="__ref-swap-widget-row-flex-center">
                <TiWarning fill="#DE5050" />
                &nbsp;
                {swapError.message}
              </div>
            )}

            <button
              type="submit"
              className="__ref-swap-widget-submit-button"
              style={{
                color: primary,
                background: buttonBg,
              }}
            >
              {isSignedIn ? 'Swap' : 'Connect Wallet'}
            </button>

            <div
              className="__ref-swap-widget-row-flex-center"
              style={{
                color: secondary,
                justifyContent: 'center',
              }}
            >
              <RefIcon />
              &nsbp; Powered by Ref.finance
            </div>

            <Notification
              state={notLoading ? 'pending' : transactionState?.state || null}
              amountIn={amountIn}
              amountOut={amountOut}
              tokenIn={tokenIn}
              tokenOut={tokenOut}
            />
          </form>
        )}
        {widgetRoute === 'token-selector-in' && (
          <TokenSelector
            tokens={tokens}
            width={width}
            onSelect={setTokenIn}
            onClose={() => setWidgetRoute('swap')}
            AccountId={AccountId}
          />
        )}

        {widgetRoute === 'token-selector-out' && (
          <TokenSelector
            tokens={tokens}
            width={width}
            onSelect={setTokenOut}
            onClose={() => setWidgetRoute('swap')}
            AccountId={AccountId}
          />
        )}
      </TokenPriceContextProvider>
    </ThemeContextProvider>
  );
};

export default SwapWidget;
