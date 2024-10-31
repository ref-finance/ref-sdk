import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { TokenMetadata, EstimateSwapView, Pool } from '../types';
import {
  ThemeContext,
  useTokenPriceList,
  TokenPriceContext,
  useTokenBalances,
} from './state';

import { FiChevronDown } from '@react-icons/all-files/fi/FiChevronDown';

import { FiChevronLeft } from '@react-icons/all-files/fi/FiChevronLeft';

import { FiChevronUp } from '@react-icons/all-files/fi/FiChevronUp';

import { FaSearch } from '@react-icons/all-files/fa/FaSearch';

import { RiRefreshLine } from '@react-icons/all-files/ri/RiRefreshLine';

import { TiArrowSortedUp } from '@react-icons/all-files/ti/TiArrowSortedUp';

import { TiArrowSortedDown } from '@react-icons/all-files/ti/TiArrowSortedDown';

import { HiOutlineExternalLink } from '@react-icons/all-files/hi/HiOutlineExternalLink';

import { AiFillPushpin } from '@react-icons/all-files/ai/AiFillPushpin';

import { AiOutlinePushpin } from '@react-icons/all-files/ai/AiOutlinePushpin';

import { RiExchangeFill } from '@react-icons/all-files/ri/RiExchangeFill';

import { IoWarning } from '@react-icons/all-files/io5/IoWarning';

import { IoCloseOutline } from '@react-icons/all-files/io5/IoCloseOutline';

import './style.css';
import {
  getAccountName,
  symbolsArr,
  multiply,
  percentOfBigNumber,
  ONLY_ZEROS,
  toRealSymbol,
  toPrecision,
  toInternationalCurrencySystemLongString,
  calculateFeeCharge,
  calculateFeePercent,
  isValidSlippageTolerance,
} from '../utils';
import { REF_WIDGET_STAR_TOKEN_LIST_KEY } from './constant';
import Big from 'big.js';
import {
  config,
  DEFAULT_SLIPPAGE_TOLERANCE,
  FEE_DIVISOR,
  getConfig,
  NEAR_META_DATA,
  TokenLinks,
  WRAP_NEAR_CONTRACT_ID,
} from '../constant';
import {
  scientificNotationToString,
  percent,
  getPoolAllocationPercents,
} from '../utils';
import {
  REF_WIDGET_SWAP_DETAIL_KEY,
  DEFAULT_START_TOKEN_LIST_TESTNET,
  DEFAULT_START_TOKEN_LIST_MAINNET,
} from './constant';
import { PoolMode } from '../v1-swap/swap';
import { isMobile, separateRoutes, divide, getMax } from '../utils';
import { SwapState } from './types';

interface TokenAmountProps {
  balance?: string;
  reloading?: JSX.Element;
  token?: TokenMetadata;
  onSelectToken: () => void;
  amount: string;
  onChangeAmount?: (amount: string) => void;
  price?: string;
  onForceUpdate?: () => void;
  poolFetchingState?: 'loading' | 'end';
  minNearAmountLeftForGasFees: number;
}

export const getPriceImpact = (
  value: string,
  tokenIn: TokenMetadata,
  tokenInAmount: string
) => {
  const textColor =
    Number(value) <= 1
      ? 'text-greenLight'
      : 1 < Number(value) && Number(value) <= 2
      ? 'text-warn'
      : 'text-error';

  const displayValue = scientificNotationToString(
    multiply(tokenInAmount || '0', divide(value, '100'))
  );

  const tokenInInfo =
    Number(displayValue) <= 0
      ? ` / 0 ${toRealSymbol(tokenIn.symbol)}`
      : ` / -${toInternationalCurrencySystemLongString(
          displayValue,
          3
        )} ${toRealSymbol(tokenIn.symbol)}`;

  if (Number(value) < 0.01)
    return (
      <span className="text-greenLight">
        {`< -0.01%`}
        {tokenInInfo}
      </span>
    );

  if (Number(value) > 1000)
    return (
      <span className="text-error">
        {`< -1000%`}
        {tokenInInfo}
      </span>
    );

  return (
    <span className={`${textColor} font-sans`}>
      {`≈ -${toPrecision(value, 2)}%`}
      {tokenInInfo}
    </span>
  );
};

export const SmartRouteV2 = ({
  tokens: tokensRaw,
  p,
  pools,
}: {
  tokens: TokenMetadata[];
  p: string;
  pools: Pool[];
}) => {
  const theme = useContext(ThemeContext);

  const tokens = tokensRaw.map(t =>
    t.id === WRAP_NEAR_CONTRACT_ID
      ? { ...NEAR_META_DATA, id: WRAP_NEAR_CONTRACT_ID }
      : t
  );

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
  } = theme;

  const ParaTokenFrom = ({
    tokenIn,
    p,
  }: {
    tokenIn: TokenMetadata;
    p: string;
  }) => {
    return (
      <div
        className="__ref-swap-widget-row-flex-center "
        style={{
          width: '60px',
        }}
      >
        <span
          style={{
            marginRight: '4px',
          }}
        >
          {p}%
        </span>
        <span className="">
          <Icon token={tokenIn} />
        </span>
      </div>
    );
  };
  const Icon = ({ token }: { token: TokenMetadata }) => {
    if (token.icon) {
      return (
        <img
          src={token.icon}
          alt=""
          style={{
            borderRadius: '100%',
            height: '16px',
            width: '16px',
            flexShrink: 0,
          }}
        />
      );
    } else {
      return (
        <div
          style={{
            borderRadius: '100%',
            height: '16px',
            width: '16px',
          }}
        />
      );
    }
  };
  const Hub = ({ token, poolId }: { token: TokenMetadata; poolId: number }) => {
    return (
      <div
        className={`__ref-swap-widget-row-flex-center`}
        style={{
          width: '62px',
          height: '22px',
        }}
      >
        <div
          className={`w-full flex items-center justify-start pl-2 `}
          style={{
            marginRight: '4px',
          }}
        >
          <span className="text-gray-400">{`#${poolId}`}</span>
        </div>
        <Icon token={token} />
      </div>
    );
  };

  if (tokens.length === 3) {
    return (
      <div className="__ref-swap-widget-row-flex-center __ref-swap-widget-swap_route_row">
        {/* <Hub token={tokens[0]} /> */}

        <ParaTokenFrom tokenIn={tokens[0]} p={p} />
        <div
          className=""
          style={{
            position: 'relative',
            bottom: '1px',
          }}
        >
          <ArrowRight />
        </div>

        <Hub token={tokens[1]} poolId={pools?.[0]?.id} />
        <div
          className="px-3"
          style={{
            position: 'relative',
            bottom: '1px',
          }}
        >
          <ArrowRight />
        </div>

        <Hub token={tokens[2]} poolId={pools?.[1]?.id} />
      </div>
    );
  } else if (tokens.length === 2) {
    return (
      <div className="__ref-swap-widget-row-flex-center __ref-swap-widget-swap_route_row">
        <ParaTokenFrom tokenIn={tokens[0]} p={p} />
        <div className="px-3">
          <ArrowRight />
        </div>
        <Hub token={tokens[1]} poolId={pools?.[0]?.id} />
      </div>
    );
  } else {
    return null;
  }
};

export const DetailView = ({
  tokenIn,
  tokenOut,
  rate,
  fee,
  minReceived,
  amountIn,
  amountOut,
  priceImpact,
  estimates,
}: {
  tokenIn: TokenMetadata | undefined;
  tokenOut: TokenMetadata | undefined;
  rate: string;
  fee: number;
  minReceived: string;
  amountIn: string;
  amountOut: string;
  priceImpact: string;
  estimates: EstimateSwapView[];
}) => {
  const theme = useContext(ThemeContext);

  const storagedOpen = !!localStorage.getItem(REF_WIDGET_SWAP_DETAIL_KEY);

  const [showDetail, setShowDetail] = useState(storagedOpen || false);
  const [isRateReverse, setIsRateReverse] = useState(false);

  const tokensPerRoute = estimates
    .filter(swap => swap.inputToken === tokenIn?.id)
    .map(swap => swap.tokens);

  const identicalRoutes = separateRoutes(
    estimates,
    estimates[estimates.length - 1]?.outputToken || ''
  );

  const pools = identicalRoutes.map(r => r[0]).map(hub => hub.pool);
  const percents = useMemo(() => {
    if (!pools || pools.length === 0) return [];
    return getPoolAllocationPercents(pools);
  }, [pools]);

  const priceImpactDisplay = useMemo(() => {
    if (!priceImpact || !tokenIn || !amountIn) return null;
    return getPriceImpact(priceImpact, tokenIn, amountIn);
  }, [priceImpact, tokenIn, amountIn]);
  if (!tokenIn || !tokenOut) return null;

  const displayRate = `1 ${toRealSymbol(tokenIn.symbol)} ≈ ${
    Number(rate) < 0.01 ? '< 0.01' : toPrecision(rate, 2)
  } ${toRealSymbol(tokenOut.symbol)}`;

  const revertRate = new Big(1).div(ONLY_ZEROS.test(rate) ? '1' : rate || '1');

  const revertDisplayRate = `1 ${toRealSymbol(tokenOut.symbol)} ≈ ${
    Number(revertRate) < 0.01 ? '< 0.01' : toPrecision(revertRate.toString(), 2)
  } ${toRealSymbol(tokenIn.symbol)}`;

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
  } = theme;

  return (
    <div
      className="__ref-widget-swap-detail-view __ref-swap-widget-col-flex-start"
      style={{
        color: secondary,
      }}
    >
      <div className="__ref-swap-widget-row-flex-center __ref-swap-widget-swap-detail-view-item">
        <div
          style={{
            color: primary,
            cursor: 'pointer',
          }}
          className="__ref-swap-widget-row-flex-center"
          onClick={() => {
            if (showDetail) localStorage.removeItem(REF_WIDGET_SWAP_DETAIL_KEY);
            else {
              localStorage.setItem(REF_WIDGET_SWAP_DETAIL_KEY, '1');
            }
            setShowDetail(!showDetail);
          }}
        >
          <div>Detail</div>
          <div
            style={{
              position: 'relative',
            }}
          >
            {!showDetail ? <FiChevronDown /> : <FiChevronUp />}
          </div>
        </div>

        {amountIn && amountOut && (
          <div className="__ref-swap-widget-row-flex-center">
            <div>{isRateReverse ? revertDisplayRate : displayRate}</div>

            <RiExchangeFill
              onClick={() => {
                setIsRateReverse(!isRateReverse);
              }}
              size={16}
              style={{
                marginLeft: '4px',
                cursor: 'pointer',
              }}
              fill={iconDefault}
            />
          </div>
        )}
      </div>
      {!showDetail ? null : (
        <>
          <div className="__ref-swap-widget-row-flex-center __ref-swap-widget-swap-detail-view-item">
            <div>Minimum received</div>
            <div>{toPrecision(minReceived || '0', 8)}</div>
          </div>

          <div className="__ref-swap-widget-row-flex-center __ref-swap-widget-swap-detail-view-item">
            <div>Fee</div>

            <div>
              {!amountIn
                ? '0'
                : `${calculateFeeCharge(fee, amountIn)} ${toRealSymbol(
                    tokenIn.symbol
                  )}(${toPrecision(calculateFeePercent(fee).toString(), 2)}%)`}
            </div>
          </div>
        </>
      )}

      {!showDetail ? null : (
        <>
          <div className="__ref-swap-widget-row-flex-center __ref-swap-widget-swap-detail-view-item">
            <div>Price impact</div>

            <div>{priceImpactDisplay}</div>
          </div>
        </>
      )}

      {estimates && estimates.length > 1 && showDetail && (
        <div
          className="__ref-swap-widget-swap_routes __ref-swap-widget-row-flex-center"
          style={{
            border: `1px solid ${borderColor}`,
            flexDirection: isMobile() ? 'column' : 'row',
            position: 'relative',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div className="__ref-swap-widget-row-flex-center">
            <RouterIcon />
            <span
              className="__ref-swap-widget-valueStyle"
              style={{
                marginLeft: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              {'Auto Router'}
            </span>
          </div>

          <div
            className=""
            style={{
              width: isMobile() ? '100%' : 'auto',
              minWidth: !isMobile() ? '70%' : '',
            }}
          >
            {tokensPerRoute.every(r => !!r) &&
              tokensPerRoute.map((tokens, index) => {
                if (!tokens) return null;
                return (
                  <SmartRouteV2
                    key={index + '-swap-route'}
                    tokens={tokens}
                    p={percents[index]}
                    pools={identicalRoutes[index].map(hub => hub.pool)}
                  />
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export const HalfAndMaxAmount = ({
  max,
  onChangeAmount,
  token,
  amount,
}: {
  max: string;
  token: TokenMetadata;
  onChangeAmount: (amount: string) => void;
  amount: string;
}) => {
  const halfValue = percentOfBigNumber(50, max, token.decimals);

  const theme = useContext(ThemeContext);
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
  } = theme;

  const [hoverHalf, setHoverHalf] = useState<boolean>(false);
  const [hoverMax, setHoverMax] = useState<boolean>(false);

  return (
    <div className="__ref-swap-widget-token-amount_quick_selector __ref-swap-widget-row-flex-center">
      <span
        className="__ref-swap-widget-token-amount_quick_selector_item "
        style={{
          color: secondary,
          borderRadius,
          border: `1px solid ${borderColor}`,
          marginRight: '4px',

          background:
            amount === halfValue && !ONLY_ZEROS.test(halfValue)
              ? active
              : hoverHalf
              ? hover
              : 'transparent',
        }}
        onMouseEnter={() => setHoverHalf(true)}
        onMouseLeave={() => setHoverHalf(false)}
        onClick={() => {
          const half = percentOfBigNumber(50, max, token.decimals);

          onChangeAmount(half);
        }}
      >
        Half
      </span>

      <span
        className="__ref-swap-widget-token-amount_quick_selector_item"
        onClick={() => {
          onChangeAmount(max);
        }}
        onMouseEnter={() => setHoverMax(true)}
        onMouseLeave={() => setHoverMax(false)}
        style={{
          color: secondary,
          borderRadius,
          border: `1px solid ${borderColor}`,
          background:
            amount === max && !ONLY_ZEROS.test(max)
              ? active
              : hoverMax
              ? hover
              : 'transparent',
        }}
      >
        Max
      </span>
    </div>
  );
};

const DECIMAL_POINT = '.';
const ALLOWED_KEYS: Record<string, boolean> = {
  '0': true,
  '1': true,
  '2': true,
  '3': true,
  '4': true,
  '5': true,
  '6': true,
  '7': true,
  '8': true,
  '9': true,
  [DECIMAL_POINT]: true,
};

const isValidInput = (value: string) => {
  let decimalPointsAmount = 0;
  if (value === DECIMAL_POINT) return false;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (!ALLOWED_KEYS[char]) return false;
    if (char === DECIMAL_POINT) {
      decimalPointsAmount++;
      if (decimalPointsAmount === 2) {
        return false;
      }
    }
  }
  return true;
};
export const TokenAmount = (props: TokenAmountProps) => {
  const {
    balance,
    reloading,
    token,
    onSelectToken,
    amount,
    onChangeAmount,
    price,
    onForceUpdate,
    poolFetchingState,
    minNearAmountLeftForGasFees,
  } = props;

  const theme = useContext(ThemeContext);
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
  } = theme;

  const ref = useRef<HTMLInputElement>(null);

  const [hoverSelect, setHoverSelect] = useState<boolean>(false);
  const handleChange = (amount: string) => {
    if (onChangeAmount) {
      onChangeAmount(amount);
    }
    if (ref.current) {
      ref.current.value = amount;
    }
  };

  useEffect(() => {
    if (
      ref.current &&
      onChangeAmount &&
      token &&
      balance &&
      token.id === WRAP_NEAR_CONTRACT_ID &&
      Number(balance) - Number(ref.current.value) < minNearAmountLeftForGasFees
    ) {
      ref.current.setCustomValidity(
        `Must have ${minNearAmountLeftForGasFees}N or more left in wallet for gas fee.`
      );
    } else {
      ref.current?.setCustomValidity('');
    }
  }, [ref, balance, ref.current, ref.current?.value, token, amount]);

  const curMax = token
    ? getMax(token.id, balance || '0', minNearAmountLeftForGasFees)
    : '0';

  return (
    <>
      <div
        className="__ref-swap-widger-token-amount "
        style={{
          background: secondaryBg,
          flexDirection: isMobile() ? 'column' : 'row',
        }}
      >
        <div
          className="__ref-swap-widget-row-flex-center"
          style={{
            width: isMobile() ? 'auto' : '40%',
          }}
        >
          <div
            className="__ref-swap-widget-row-flex-center __ref-swap-widget-token-amount_token-select-button"
            style={{
              color: primary,
              background: hoverSelect ? hover : 'transparent',
              border: `1px solide ${hoverSelect ? borderColor : 'transparent'}`,
            }}
            onClick={onSelectToken}
            onMouseEnter={() => setHoverSelect(true)}
            onMouseLeave={() => setHoverSelect(false)}
          >
            {!token ? (
              <>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    height: '26px',
                    userSelect: 'none',
                  }}
                  className="__ref-swap-widget-row-flex-center"
                >
                  Select Token
                </span>
              </>
            ) : (
              <>
                <img
                  src={token?.icon}
                  alt=""
                  className="__ref-swap-widget_token_icon"
                  style={{
                    height: '26px',
                    width: '26px',
                    marginRight: '8px',
                  }}
                />
                <span>{toRealSymbol(token?.symbol)}</span>
              </>
            )}
            <FiChevronDown
              style={{
                marginLeft: '4px',
                flexShrink: 0,
              }}
            />
          </div>

          {onForceUpdate && (
            <RiRefreshLine
              className={`${
                poolFetchingState === 'loading'
                  ? '__ref-swap-widget-loading '
                  : ''
              }`}
              style={{
                cursor: 'pointer',
                color: secondary,
              }}
              size={18}
              onClick={() => {
                onForceUpdate();
              }}
            />
          )}
        </div>

        <div
          className=" __ref-swap-widget-token-amount_input"
          style={{
            width: isMobile() ? '100%' : '60%',
          }}
        >
          <input
            ref={ref}
            max={!!onChangeAmount ? curMax : undefined}
            onWheel={() => {
              if (ref.current) {
                ref.current.blur();
              }
            }}
            className="__ref-swap-widget-input-class"
            value={amount}
            type="text"
            placeholder={!onChangeAmount ? '-' : '0.0'}
            onChange={({ target }) => {
              if (!isValidInput(target.value)) return;
              target.setCustomValidity('');
              handleChange(target.value);
            }}
            disabled={!onChangeAmount}
            style={{
              color: primary,
              marginBottom: '8px',
              width: '100%',
              textAlign: 'right',
              fontSize: '20px',
            }}
          />

          <div
            style={{
              fontSize: '12px',
              color: secondary,
              textAlign: 'right',
            }}
          >
            {!price
              ? '$-'
              : '~$' +
                toInternationalCurrencySystemLongString(
                  multiply(price, amount || '0'),
                  2
                )}
          </div>
        </div>
      </div>

      {!balance || !token || !onChangeAmount ? null : (
        <div
          className="__ref-swap-widger-token-amount_balance __ref-swap-widget-row-flex-center"
          style={{
            fontSize: '12px',
            color: secondary,
          }}
        >
          <span>
            Balance:&nbsp;
            {toPrecision(balance, 2)}
          </span>
          {token && (
            <HalfAndMaxAmount
              token={token}
              max={getMax(token.id, balance, minNearAmountLeftForGasFees)}
              onChangeAmount={handleChange}
              amount={amount}
            />
          )}
        </div>
      )}
    </>
  );
};

export const SlippageSelector = ({
  slippageTolerance,
  onChangeSlippageTolerance,
  setShowSlip,
}: {
  slippageTolerance: string;
  onChangeSlippageTolerance: (slippageTolerance: string) => void;
  setShowSlip: (showSlip: boolean) => void;
}) => {
  const [invalid, setInValid] = useState<boolean>(false);

  const theme = useContext(ThemeContext);
  const { container, buttonBg, primary, borderRadius, borderColor } = theme;

  const handleChange = (amount: string) => {
    onChangeSlippageTolerance(amount);
    setInValid(!isValidSlippageTolerance(Number(amount)));
  };

  useEffect(() => {
    const onClick = (event: Event) => {
      if (!event.target) return;
      if (
        (event.target as HTMLElement).closest('#__ref-slippage-container') ===
        null
      ) {
        setShowSlip(false);
        if (invalid) onChangeSlippageTolerance(DEFAULT_SLIPPAGE_TOLERANCE);
      }
    };

    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
    };
  }, [invalid]);

  return (
    <div
      className="__ref-swap-widget_slippage_selector __ref-swap-widget-col-flex-start"
      id="__ref-slippage-container"
      onClick={e => e.stopPropagation()}
      style={{
        background: container,
        border: `1px solid ${borderColor}`,
      }}
    >
      <span
        style={{
          color: primary,
          paddingBottom: '14px',
        }}
      >
        Slippage tolerance
      </span>

      <div
        className={`__ref-swap-widget-row-flex-center
      `}
      >
        <div
          className={`__ref-swap-widget-row-flex-center
        __ref-swap-widget_slippage_selector_input_container`}
          style={{
            border: `1px solid ${invalid ? '#FF7575' : borderColor}`,
            borderRadius,
            color: invalid ? '#FF7575' : primary,
          }}
        >
          <input
            value={slippageTolerance}
            type="text"
            required={true}
            placeholder=""
            onChange={event => {
              if (isValidInput(event.target.value)) {
                handleChange(event.target.value);
              }
            }}
            style={{
              width: '100%',
            }}
            className="__ref-swap-widget-input-class"
          />
          <span className="ml-2">%</span>
        </div>

        <button
          className={`__ref-swap-widget_slippage_selector_button __ref-swap-widget-button ${
            isMobile()
              ? '__ref-swap-widget-opacity-active'
              : '__ref-swap-widget-opacity-hover'
          }`}
          style={{
            color: primary,
            background: buttonBg,
            borderRadius,
          }}
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            onChangeSlippageTolerance(DEFAULT_SLIPPAGE_TOLERANCE);
            setInValid(false);
          }}
        >
          Auto
        </button>
      </div>
      {invalid && (
        <div
          className=" text-xs py-3 __ref-swap-widget-row-flex-center"
          style={{
            color: '#FF7575',
            fontSize: '12px',
            padding: '10px 0px 0px 0px',
            alignItems: 'start',
          }}
        >
          <IoWarning
            className=""
            style={{
              marginRight: '4px',
            }}
            size={20}
          />
          <div>{'The slippage tolerance is invalid.'}</div>
        </div>
      )}
    </div>
  );
};

const StarToken = ({
  price,
  token,
  onDelete,
  onClick,
}: {
  token: TokenMetadata;
  price: string;
  onDelete: (token: TokenMetadata) => void;
  onClick: (token: TokenMetadata) => void;
}) => {
  const theme = useContext(ThemeContext);
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
  } = theme;

  const [hoverIcon, setHoverIcon] = useState(false);

  const [hoverClose, setHoverClose] = useState(false);

  return (
    <div
      className="__ref-swap-widget_star_token __ref-swap-widget-row-flex-center"
      onMouseEnter={() => setHoverIcon(true)}
      onMouseLeave={() => setHoverIcon(false)}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        onClick(token);
      }}
      style={{
        background: hoverIcon ? hover : 'transparent',
        border: `1px solid ${borderColor}`,
      }}
    >
      {hoverIcon && (
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            boxShadow: '0px 0px 2px rgba(0, 0, 0, 0.25)',
            border: `1px solid ${borderColor}`,
            borderRadius: '100%',
            width: '16px',
            height: '16px',
            background: '#E3E3E3',
          }}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(token);
          }}
          onMouseEnter={() => setHoverClose(true)}
          onMouseLeave={() => setHoverClose(false)}
        >
          <IoCloseOutline stroke={hoverClose ? 'black' : '#7e8a93'} />
        </div>
      )}

      <img
        src={token.icon}
        alt=""
        className="__ref-swap-widget_token_icon"
        style={{
          height: '26px',
          width: '26px',
          marginRight: '2px',
        }}
      />

      <div className="__ref-swap-widget-col-flex-start">
        <span
          style={{
            fontSize: '14px',
            color: primary,
          }}
        >
          {toRealSymbol(token.symbol)}
        </span>

        <span
          style={{
            fontSize: '10px',
            color: secondary,
          }}
        >
          {!price
            ? '$-'
            : '$' + toInternationalCurrencySystemLongString(price, 2)}
        </span>
      </div>
    </div>
  );
};

interface TokenProps {
  token: TokenMetadata;
  onClick: (token: TokenMetadata) => void;
  onClickPin: (token: TokenMetadata) => void;
  balance: string;
  price?: string;
  isSticky?: boolean;
  index: number;
  setHoverIndex: (index: number) => void;
  hoverIndex: number;
}

const Token = ({
  token,
  onClick,
  price,
  balance,
  isSticky,
  onClickPin,
  index,
  setHoverIndex,
  hoverIndex,
}: TokenProps) => {
  const theme = useContext(ThemeContext);
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
  } = theme;

  const displayBalance =
    0 < Number(balance) && Number(balance) < 0.001
      ? '< 0.001'
      : toPrecision(String(balance), 3);

  const [hoverOutLink, setHoverOutLink] = useState(false);

  const [hoverPin, setHoverPin] = useState(false);

  return (
    <div
      className="__ref-swap-widget_token-selector-token-list-item __ref-swap-widget-row-flex-center"
      style={{
        background: hoverIndex === index ? hover : 'transparent',
      }}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        onClick(token);
      }}
      onMouseEnter={() => setHoverIndex(index)}
      onMouseLeave={() => setHoverIndex(-1)}
    >
      <div
        className="__ref-swap-widget-row-flex-center"
        style={{
          justifyContent: 'space-between',
        }}
      >
        <img
          src={token.icon}
          alt=""
          className="__ref-swap-widget_token_icon"
          style={{
            height: '36px',
            width: '36px',
            marginRight: '10px',
          }}
        />

        <div className="__ref-swap-widget-col-flex-start">
          <span
            style={{
              fontSize: '14px',
              color: primary,
            }}
            className="__ref-swap-widget-row-flex-center"
          >
            {toRealSymbol(token.symbol)}

            {TokenLinks[token.symbol] && (
              <HiOutlineExternalLink
                onMouseEnter={() => setHoverOutLink(true)}
                onMouseLeave={() => setHoverOutLink(false)}
                style={{
                  marginLeft: '4px',
                  marginTop: '2px',
                }}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(TokenLinks[token.symbol], '_blank');
                }}
                stroke={hoverOutLink ? iconHover : iconDefault}
              />
            )}
          </span>

          <span
            style={{
              fontSize: '10px',
              color: secondary,
              marginTop: '2px',
            }}
          >
            {!price
              ? '$-'
              : '$' + toInternationalCurrencySystemLongString(price, 2)}
          </span>
        </div>
      </div>

      <div
        className="__ref-swap-widget-row-flex-center"
        style={{
          color: primary,
        }}
      >
        {displayBalance}

        {isSticky ? (
          <AiFillPushpin
            onMouseEnter={() => setHoverPin(true)}
            onMouseLeave={() => setHoverPin(false)}
            fill={hoverPin && hoverIndex === index ? iconHover : iconDefault}
            style={{
              marginLeft: '10px',
              cursor: 'pointer',
            }}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onClickPin(token);
            }}
          />
        ) : (
          <AiOutlinePushpin
            style={{
              marginLeft: '10px',
              cursor: 'pointer',
            }}
            onMouseEnter={() => setHoverPin(true)}
            onMouseLeave={() => setHoverPin(false)}
            fill={hoverPin && hoverIndex === index ? iconHover : iconDefault}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onClickPin(token);
            }}
          />
        )}
      </div>
    </div>
  );
};

interface TokenListProps {
  tokens: TokenMetadata[];
  onClick: (token: TokenMetadata) => void;
  balances: { [tokenId: string]: string };
  tokenPriceList: Record<string, any> | null;
  starList: string[];
  setStarList: (starList: string[]) => void;
  onDelete: (token: TokenMetadata) => void;
}

export const TokenListTable = ({
  tokens,
  onClick,
  balances,
  tokenPriceList,
  starList,
  setStarList,
  onDelete,
}: TokenListProps) => {
  const [currentSort, setCurrentSort] = useState('down');
  const theme = useContext(ThemeContext);
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
  } = theme;

  const onClickPin = (token: TokenMetadata) => {
    if (starList.includes(token.id)) {
      onDelete(token);
    } else {
      const newList = [...starList, token.id];
      setStarList(newList);
    }
  };

  const [hoverIndex, setHoverIndex] = useState(-1);

  const tokenSorting = (a: TokenMetadata, b: TokenMetadata) => {
    const b1 = balances[a.id];
    const b2 = balances[b.id];

    if (currentSort === 'up') {
      return Number(b1) - Number(b2);
    } else return Number(b2) - Number(b1);
  };

  return !tokens || tokens.length === 0 ? null : (
    <div className="__ref-swap-widget_token_list_table">
      <div
        className="__ref-swap-widget_token_list_table_header"
        style={{
          color: secondary,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <span className="">Asset</span>

        <span
          onClick={() => {
            setCurrentSort(currentSort === 'up' ? 'down' : 'up');
          }}
          style={{
            cursor: 'pointer',
          }}
          className="__ref-swap-widget-row-flex-center"
        >
          <span className="ml-1">Balance</span>
          {currentSort === 'up' ? <TiArrowSortedUp /> : <TiArrowSortedDown />}
        </span>
      </div>

      <div className="__ref-swap-widget_token_list_table_content">
        {tokens.sort(tokenSorting).map((token, index) => (
          <Token
            key={token.id + '-select-token-list-item-' + index}
            onClick={onClick}
            index={index}
            token={token}
            price={tokenPriceList?.[token.id]?.price}
            balance={balances?.[token.id] || '0'}
            onClickPin={onClickPin}
            isSticky={starList.includes(token.id)}
            setHoverIndex={setHoverIndex}
            hoverIndex={hoverIndex}
          />
        ))}
      </div>
    </div>
  );
};

export const TokenSelector = ({
  onSelect,
  width,
  tokens,
  onClose,
  AccountId,
  balances,
  className,
}: {
  onSelect: (token: TokenMetadata) => void;
  width: string;
  tokens: TokenMetadata[];
  onClose: () => void;
  AccountId: string;
  balances: { [tokenId: string]: string };
  className?: string;
}) => {
  const theme = useContext(ThemeContext);
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
    iconDefault,
    iconHover,
  } = theme;

  const [searchValue, setSearchValue] = useState<string>('');

  const tokenPriceList = useContext(TokenPriceContext);

  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const storagedStartList = localStorage.getItem(REF_WIDGET_STAR_TOKEN_LIST_KEY)
    ? JSON.parse(localStorage.getItem(REF_WIDGET_STAR_TOKEN_LIST_KEY) || '[]')
    : null;

  const DEFAULT_START_TOKEN_LIST =
    getConfig().networkId === 'testnet'
      ? DEFAULT_START_TOKEN_LIST_TESTNET
      : DEFAULT_START_TOKEN_LIST_MAINNET;

  const [starList, setStarList] = useState<string[]>(
    storagedStartList || DEFAULT_START_TOKEN_LIST
  );

  const onDelete = (token: TokenMetadata) => {
    const newStarList = starList.filter(starToken => starToken !== token.id);

    setStarList(newStarList);

    localStorage.setItem(
      REF_WIDGET_STAR_TOKEN_LIST_KEY,
      JSON.stringify(newStarList)
    );
  };

  const tableListFilter = (token: TokenMetadata) => {
    if (!searchValue) return true;

    const searchValueLower = searchValue.toLowerCase();

    return token.symbol?.toLowerCase().includes(searchValueLower) || false;
  };

  return (
    <div
      className={`__ref-swap_widget-token_selector __ref-swap-widget-container ${className}`}
      style={{
        position: 'relative',
        width,
        background: container,
      }}
    >
      <FiChevronLeft
        onClick={onClose}
        style={{
          color: primary,
          position: 'absolute',
          cursor: 'pointer',
        }}
      />
      <div
        className="__ref-swap-widget-header-title __ref-swap-widget-row-flex-center"
        style={{
          color: primary,
          justifyContent: 'center',
          paddingBottom: '24px',
        }}
      >
        Select a token
      </div>

      <div
        className="__ref-swap-widget-select-token_input __ref-swap-widget-row-flex-center"
        style={{
          border: `1px solid ${buttonBg}`,
          background: secondaryBg,
        }}
      >
        <FaSearch
          fill={iconDefault}
          style={{
            marginRight: '8px',
          }}
        />

        <input
          className="__ref-swap-widget-input-class"
          placeholder="Search token..."
          onChange={evt => handleSearch(evt.target.value)}
          style={{
            fontSize: '14px',
            color: primary,
          }}
        />
      </div>

      <div className="__ref-swap-widget_token-selector-star-tokens __ref-swap-widget-row-flex-center">
        {starList.map(id => {
          if (!tokens || tokens.length === 0) return null;

          const token = tokens.find(token => token.id === id);

          return !token ? null : (
            <StarToken
              key={token.id + '-star-token'}
              token={token}
              price={tokenPriceList?.[token.id]?.price}
              onDelete={onDelete}
              onClick={onSelect}
            />
          );
        })}
      </div>

      <TokenListTable
        tokens={tokens.filter(tableListFilter)}
        tokenPriceList={tokenPriceList}
        onClick={onSelect}
        balances={balances}
        starList={starList}
        setStarList={starList => {
          setStarList(starList);
          localStorage.setItem(
            REF_WIDGET_STAR_TOKEN_LIST_KEY,
            JSON.stringify(starList)
          );
        }}
        onDelete={onDelete}
      />
    </div>
  );
};

export const Slider = ({
  showSlip,
  setShowSlip,
}: {
  showSlip: boolean;
  setShowSlip: (show: boolean) => void;
}) => {
  const [hover, setHover] = useState(false);

  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => setShowSlip(true)}
      className="cursor-pointer"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.6957 13.0652C12.6957 14.1338 11.8294 15 10.7609 15C9.69235 15 8.82611 14.1338 8.82611 13.0652C8.82612 11.9967 9.69235 11.1304 10.7609 11.1304C11.8294 11.1304 12.6957 11.9967 12.6957 13.0652ZM14.5749 12.0941C14.6145 12.0894 14.6548 12.0869 14.6957 12.0869L15.9565 12.0869C16.5088 12.0869 16.9565 12.5346 16.9565 13.0869C16.9565 13.6392 16.5088 14.0869 15.9565 14.0869L14.6957 14.0869C14.651 14.0869 14.6071 14.084 14.564 14.0783C14.1171 15.7605 12.5837 17 10.7609 17C8.93806 17 7.40472 15.7605 6.95777 14.0783C6.91471 14.084 6.87078 14.0869 6.82617 14.0869L1.00009 14.0869C0.447802 14.0869 8.61245e-05 13.6392 8.61728e-05 13.0869C8.62211e-05 12.5346 0.447802 12.0869 1.00009 12.0869L6.82617 12.0869C6.86702 12.0869 6.90729 12.0894 6.94686 12.0941C7.37926 10.3906 8.92291 9.13044 10.7609 9.13044C12.5989 9.13044 14.1425 10.3906 14.5749 12.0941ZM4.26086 3.93478C4.26086 2.86623 5.1271 2 6.19565 2C7.2642 2 8.13043 2.86623 8.13043 3.93478C8.13043 5.00333 7.2642 5.86957 6.19565 5.86957C5.1271 5.86956 4.26086 5.00333 4.26086 3.93478ZM6.19565 9.66601e-07C4.3728 8.07243e-07 2.83946 1.23952 2.39252 2.92168C2.34944 2.91601 2.3055 2.91309 2.26087 2.91309L0.999999 2.91309C0.447715 2.91309 -7.14972e-07 3.3608 -7.63254e-07 3.91309C-8.11537e-07 4.46537 0.447715 4.91309 0.999999 4.91309L2.26087 4.91309C2.30173 4.91309 2.34202 4.91063 2.3816 4.90587C2.81401 6.60936 4.35766 7.86956 6.19565 7.86957C8.03363 7.86957 9.57728 6.60936 10.0097 4.90588C10.0493 4.91064 10.0895 4.91309 10.1304 4.91309L15.9565 4.91309C16.5087 4.91309 16.9565 4.46537 16.9565 3.91309C16.9565 3.3608 16.5087 2.91309 15.9565 2.91309L10.1304 2.91309C10.0858 2.91309 10.0418 2.91601 9.99877 2.92167C9.55182 1.23952 8.01849 1.12596e-06 6.19565 9.66601e-07Z"
        fill={hover || showSlip ? '#00C6A2' : '#7E8A93'}
      />
    </svg>
  );
};

export const RefIcon = (props: any) => {
  return (
    <svg
      {...props}
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6.36365 10H10L6.36365 6.36363V10Z" fill="currentColor" />
      <path
        d="M10 4.05312e-06L7.87879 3.86767e-06L10 2.12122L10 4.05312e-06Z"
        fill="#00C6A2"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.51531 6.36364C6.46444 6.36364 6.41387 6.36232 6.36365 6.35971V4.08371L8.83901 1.78516C9.18802 2.26148 9.3941 2.8491 9.3941 3.48485C9.3941 5.07476 8.10522 6.36364 6.51531 6.36364ZM8.19255 1.14486L6.36365 2.84313V0.60999C6.41387 0.607383 6.46444 0.606064 6.51531 0.606064C7.14111 0.606064 7.72027 0.805743 8.19255 1.14486Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.06046 0.606064H3.33319V3.29661L4.55696 4.52039L6.06046 3.12428V0.606064ZM6.06046 4.36486L4.5336 5.78267L3.33319 4.58226V10H6.06046V4.36486Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.0303 0.606064H0V4.50881L2.27284 2.23598L3.0303 2.99344V0.606064ZM3.0303 4.27909L2.27284 3.52162L0 5.79446V10H3.0303V4.27909Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const Loading = () => {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="__ref-swap-widget-loading"
    >
      <circle
        cx="19"
        cy="19"
        r="16"
        stroke="#EEEEEE"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M19 35C27.8366 35 35 27.8366 35 19C35 10.1634 27.8366 3 19 3C10.1634 3 3 10.1634 3 19"
        stroke="#00C6A2"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const Warning = () => {
  return (
    <svg
      width="49"
      height="49"
      viewBox="0 0 49 49"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.0359 5.99999C22.5755 3.33333 26.4245 3.33333 27.9641 6L42.2535 30.75C43.7931 33.4167 41.8686 36.75 38.7894 36.75H10.2106C7.13137 36.75 5.20688 33.4167 6.74648 30.75L21.0359 5.99999Z"
        stroke="#FF689E"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="14"
        x2="24"
        y2="24"
        stroke="#FF689E"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="24" cy="30" r="2" fill="#FF689E" />
    </svg>
  );
};

export const Success = () => {
  return (
    <div
      style={{
        position: 'relative',
        height: '32px',
        width: '32px',
      }}
    >
      <svg
        width="38"
        height="38"
        viewBox="0 0 38 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <circle
          cx="19"
          cy="19"
          r="16"
          stroke="#EEEEEE"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>

      <svg
        width="30"
        height="23"
        viewBox="0 0 30 23"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
        }}
      >
        <path
          d="M2 11.2727L10.4898 20L28 2"
          stroke="#00C6A2"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export const RouterIcon = () => {
  return (
    <svg
      width="16"
      height="12"
      viewBox="0 0 16 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mr-2"
    >
      <path
        d="M13.4862 6.25488C12.2813 6.25488 11.2485 7.10159 11.019 8.28698H6.02703L4.7647 7.21448C4.93684 6.8758 5.05159 6.48067 5.10897 6.0291C5.10897 5.52107 4.93684 4.9566 4.59257 4.56147L6.02703 3.1503H11.0763C11.478 4.44858 12.8551 5.23884 14.1748 4.84371C15.4945 4.44858 16.2978 3.09385 15.8961 1.79557C15.4945 0.497295 14.1174 -0.292963 12.7977 0.102166C11.937 0.327954 11.3059 1.00532 11.0763 1.79557H5.51062L3.50237 3.77122C3.21548 3.65832 2.92859 3.60188 2.58432 3.60188C1.20723 3.54543 0.0596573 4.61792 0.00227872 5.97265C-0.0550999 7.32738 0.977715 8.45632 2.3548 8.51276H2.58432C3.04334 8.51276 3.44499 8.39987 3.84664 8.17408L5.568 9.6417H11.1911C11.7075 10.8835 13.142 11.5045 14.4043 11.0529C15.6666 10.5449 16.2978 9.13368 15.8388 7.89185C15.4371 6.8758 14.5191 6.25488 13.4862 6.25488V6.25488ZM13.4862 1.344C14.1174 1.344 14.6338 1.85202 14.6338 2.47294C14.6338 3.09385 14.1174 3.60188 13.4862 3.60188C12.8551 3.60188 12.3387 3.09385 12.3387 2.47294C12.3387 1.85202 12.8551 1.344 13.4862 1.344ZM2.58432 7.15804C1.95315 7.15804 1.43674 6.65001 1.43674 6.0291C1.43674 5.40818 1.95315 4.90016 2.58432 4.90016C3.21548 4.90016 3.73189 5.40818 3.73189 6.0291C3.73189 6.65001 3.21548 7.15804 2.58432 7.15804ZM13.4862 9.86749C12.8551 9.86749 12.3387 9.35947 12.3387 8.73855C12.3387 8.11763 12.8551 7.60961 13.4862 7.60961C14.1174 7.60961 14.6338 8.11763 14.6338 8.73855C14.6338 9.35947 14.1174 9.86749 13.4862 9.86749Z"
        fill="url(#paint0_linear_12461_2312)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_12461_2312"
          x1="8"
          y1="0"
          x2="8"
          y2="11.2"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#00C6A2" />
          <stop offset="1" stopColor="#8C78FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const Notification = ({
  state,
  tx,
  detail,
  setSwapState,
}: {
  state: SwapState;
  setSwapState: (state: SwapState) => void;
  tx?: string;
  detail?: string;
}) => {
  const theme = useContext(ThemeContext);
  const { container, buttonBg, primary } = theme;

  const notificationStatus = useMemo(() => {
    return {
      isClosed: false,
      isWaitingForConfirmation: state === 'waitingForConfirmation',
      isFailure: state === 'fail',
      isSuccess: state === 'success',
    };
  }, [state]);

  return (
    <div
      className="__ref-swap-widget-notification"
      style={{
        color: primary,
        background: container,
      }}
    >
      <div className="__ref-swap-widget-notification__icon">
        {notificationStatus.isWaitingForConfirmation && <Loading />}
        {notificationStatus.isFailure && <Warning />}
        {notificationStatus.isSuccess && <Success />}
      </div>

      <div
        style={{
          fontSize: '16px',
          marginTop: '10px',
          marginBottom: '6px',
        }}
      >
        {notificationStatus.isSuccess && <p>Success!</p>}
        {notificationStatus.isFailure && <p>Swap Failed!</p>}
      </div>
      <div
        className="text-center"
        style={{
          color: primary,
        }}
      >
        {notificationStatus.isWaitingForConfirmation && (
          <p>Waiting for confirmation</p>
        )}
        {notificationStatus.isSuccess && tx && (
          <a
            className="text-primary font-semibold"
            href={`${config.explorerUrl}/txns/${tx}`}
            target="_blank"
            style={{
              textDecoration: 'underline',
              fontSize: '14px',
              color: primary,
            }}
            rel="noreferrer"
          >
            Click to view.
          </a>
        )}

        {notificationStatus.isSuccess && detail}
      </div>
      {state !== null && (
        <button
          className="__ref-swap-widget-notification__button __ref-swap-widget-button"
          style={{
            background: buttonBg,
            fontWeight: 700,
            color: 'white',
          }}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            setSwapState(null);
          }}
        >
          Close
        </button>
      )}
    </div>
  );
};

export const ArrowRight = () => {
  return (
    <div className="mx-1">
      <svg
        width="12"
        height="5"
        viewBox="0 0 12 5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.864 4.4C9.024 4.05867 9.17867 3.76 9.328 3.504C9.488 3.248 9.64267 3.03467 9.792 2.864H0.464V2.192H9.792C9.64267 2.01067 9.488 1.792 9.328 1.536C9.17867 1.28 9.024 0.986666 8.864 0.656H9.424C10.096 1.43467 10.8 2.01067 11.536 2.384V2.672C10.8 3.03467 10.096 3.61067 9.424 4.4H8.864Z"
          fill="#7E8A93"
        />
      </svg>
    </div>
  );
};

export const AccountButton = ({
  AccountId,
  onDisConnect,
}: {
  AccountId: string;
  onDisConnect: () => void;
}) => {
  const [hoverAccount, setHoverAccount] = useState<boolean>(false);

  const theme = useContext(ThemeContext);
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
    iconDefault,
    iconHover,
    borderColor,
  } = theme;

  return !AccountId ? null : (
    <div
      className="__ref-swap-widget-header-button-account __ref-swap-widget-row-flex-center"
      style={{
        color: primary,
        background: secondaryBg,
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
      {hoverAccount ? 'Disconnect' : getAccountName(AccountId)}
    </div>
  );
};
