import {
  Pool,
  PoolRPCView,
  StablePool,
  SmartRoutingInputPool,
  Transaction,
  EstimateSwapView,
} from './types';
import {
  FEE_DIVISOR,
  RATED_POOL_LP_TOKEN_DECIMALS,
  STABLE_LP_TOKEN_DECIMALS,
} from './constant';

import {
  transactions,
  utils,
  transactions as nearTransactions,
} from 'near-api-js';

import _, { sortBy } from 'lodash';

import BN from 'bn.js';

import * as math from 'mathjs';
import {
  REF_FI_CONTRACT_ID,
  WRAP_NEAR_CONTRACT_ID,
  STORAGE_TO_REGISTER_WITH_MFT,
} from './constant';
import Big from 'big.js';
import { TokenMetadata } from './types';
import { PoolMode } from './v1-swap/swap';
import { getSwappedAmount } from './stable-swap';
import { NoFeeToPool } from './error';
import { CONSTANT_D, POINTLEFTRANGE, POINTRIGHTRANGE } from './constant';
import { DCL_POOL_FEE_LIST } from './dcl-swap/dcl-pool';

export const parsePool = (pool: PoolRPCView, id?: number): Pool => ({
  id: Number(typeof id === 'number' ? id : pool.id),
  tokenIds: pool.token_account_ids,
  supplies: pool.amounts.reduce(
    (acc: { [tokenId: string]: string }, amount: string, i: number) => {
      acc[pool.token_account_ids[i]] = amount;
      return acc;
    },
    {}
  ),
  fee: pool.total_fee,
  shareSupply: pool.shares_total_supply,
  tvl: pool.tvl,
  token0_ref_price: pool.token0_ref_price,
  pool_kind: pool.pool_kind,
});

export const poolFormatter = (pool: Pool) => {
  return {
    id: pool.id,
    token1Id: pool.tokenIds[0],
    token2Id: pool.tokenIds[1],
    token1Supply: pool.supplies[pool.tokenIds[0]],
    token2Supply: pool.supplies[pool.tokenIds[1]],
    fee: pool.fee,
    shares: pool.shareSupply,
    token0_price: pool.token0_ref_price || '0',
  } as SmartRoutingInputPool;
};

export const isStablePoolToken = (
  stablePools: StablePool[],
  tokenId: string | Number
) => {
  return stablePools
    .map(p => p.token_account_ids)
    .flat()
    .includes(tokenId.toString());
};

export const isStablePool = (
  stablePools: StablePool[],
  poolId: string | number
) => {
  return stablePools.map(p => p.id.toString()).includes(poolId.toString());
};

export const getStablePoolDecimal = (stablePool: StablePool) => {
  return stablePool.pool_kind === 'RATED_SWAP'
    ? RATED_POOL_LP_TOKEN_DECIMALS
    : STABLE_LP_TOKEN_DECIMALS;
};

export const round = (decimals: number, minAmountOut: string) => {
  return Number.isInteger(Number(minAmountOut))
    ? minAmountOut
    : Math.ceil(
        Math.round(Number(minAmountOut) * Math.pow(10, decimals)) /
          Math.pow(10, decimals)
      ).toString();
};

export const convertToPercentDecimal = (percent: number) => {
  return math.divide(percent, 100);
};

export const percentOf = (percent: number, num: number | string) => {
  return math.evaluate(`${convertToPercentDecimal(percent)} * ${num}`);
};

export const percentLess = (percent: number, num: number | string) => {
  return math.format(math.evaluate(`${num} - ${percentOf(percent, num)}`), {
    notation: 'fixed',
  });
};

export const getGas = (gas: string | undefined) =>
  gas ? new BN(gas) : new BN('100000000000000');

export const getAmount = (amount: string) =>
  amount ? new BN(utils.format.parseNearAmount(amount) || '0') : new BN('0');

export const ONLY_ZEROS = /^0*\.?0*$/;

export const toReadableNumber = (
  decimals: number,
  number: string = '0'
): string => {
  if (!decimals) return number;

  const wholeStr = number.substring(0, number.length - decimals) || '0';
  const fractionStr = number
    .substring(number.length - decimals)
    .padStart(decimals, '0')
    .substring(0, decimals);

  return `${wholeStr}.${fractionStr}`.replace(/\.?0+$/, '');
};

export const toNonDivisibleNumber = (
  decimals: number,
  number: string
): string => {
  if (decimals === null || decimals === undefined) return number;
  const [wholePart, fracPart = ''] = number.split('.');

  return `${wholePart}${fracPart.padEnd(decimals, '0').slice(0, decimals)}`
    .replace(/^0+/, '')
    .padStart(1, '0');
};

export const scientificNotationToString = (strParam: string) => {
  let flag = /e/.test(strParam);
  if (!flag || !strParam) return strParam;

  let sysbol = true;
  if (/e-/.test(strParam)) {
    sysbol = false;
  }

  const negative = Number(strParam) < 0 ? '-' : '';

  let index = Number(strParam.match(/\d+$/)?.[0]);

  let basis = strParam.match(/[\d\.]+/)?.[0];

  if (!index || !basis) return strParam;

  const ifFraction = basis.includes('.');

  let wholeStr;
  let fractionStr;

  if (ifFraction) {
    wholeStr = basis.split('.')[0];
    fractionStr = basis.split('.')[1];
  } else {
    wholeStr = basis;
    fractionStr = '';
  }

  if (sysbol) {
    if (!ifFraction) {
      return negative + wholeStr.padEnd(index + wholeStr.length, '0');
    } else {
      if (fractionStr.length <= index) {
        return negative + wholeStr + fractionStr.padEnd(index, '0');
      } else {
        return (
          negative +
          wholeStr +
          fractionStr.substring(0, index) +
          '.' +
          fractionStr.substring(index)
        );
      }
    }
  } else {
    if (!ifFraction)
      return (
        negative +
        wholeStr.padStart(index + wholeStr.length, '0').replace(/^0/, '0.')
      );
    else {
      return (
        negative +
        wholeStr.padStart(index + wholeStr.length, '0').replace(/^0/, '0.') +
        fractionStr
      );
    }
  }
};

export const formatWithCommas = (value: string) => {
  const pattern = /(-?\d+)(\d{3})/;
  while (pattern.test(value)) {
    value = value.replace(pattern, '$1,$2');
  }
  return value;
};

export const toPrecision = (
  number: string,
  precision: number,
  withCommas: boolean = false,
  atLeastOne: boolean = true
): string => {
  const [whole, decimal = ''] = number.split('.');

  let str = `${withCommas ? formatWithCommas(whole) : whole}.${decimal.slice(
    0,
    precision
  )}`.replace(/\.$/, '');
  if (atLeastOne && Number(str) === 0 && str.length > 1) {
    var n = str.lastIndexOf('0');
    str = str.slice(0, n) + str.slice(n).replace('0', '1');
  }

  return str;
};

export const transformTransactions = (
  transactions: Transaction[],
  AccountId: string
) => {
  const parsedTransactions = transactions.map((t: Transaction) => {
    return {
      signerId: AccountId,
      receiverId: t.receiverId,
      actions: t.functionCalls.map(fc => {
        return {
          type: 'FunctionCall',
          params: {
            methodName: fc.methodName,
            args: fc.args || {},
            gas: getGas(fc.gas)
              .toNumber()
              .toFixed(),
            deposit: utils.format.parseNearAmount(fc.amount || '0')!,
          },
        };
      }),
    };
  });

  return parsedTransactions;
};

export const WalletSelectorTransactions = (
  transactions: Transaction[],
  AccountId: string
) => {
  const parsedTransactions = transactions.map((t: Transaction) => {
    return {
      signerId: AccountId,
      receiverId: t.receiverId,
      actions: t.functionCalls.map(fc => {
        return {
          type: 'FunctionCall',
          params: {
            methodName: fc.methodName,
            args: fc.args || {},
            gas: getGas(fc.gas)
              .toNumber()
              .toFixed(),
            deposit: utils.format.parseNearAmount(fc.amount || '0')!,
          },
        };
      }),
    };
  });

  return { transactions: parsedTransactions } ;
};

export const separateRoutes = (
  actions: EstimateSwapView[],
  outputToken: string
) => {
  const res = [];
  let curRoute = [];

  for (let i in actions) {
    curRoute.push(actions[i]);
    if (actions[i].outputToken === outputToken) {
      res.push(curRoute);
      curRoute = [];
    }
  }

  return res;
};

export const calculateExchangeRate = (
  from: string,
  to: string,
  precision?: number
) => {
  return math
    .floor(math.evaluate(`${to} / ${from}`), precision || 4)
    .toString();
};

export const getAvgFee = (
  estimates: EstimateSwapView[],
  outputToken: string,
  parsedAmountIn: string
) => {
  if (!estimates || estimates.length === 0) {
    return 0;
  }

  const routes = separateRoutes(estimates, outputToken);

  let fee = new Big(0);

  routes.forEach(r => {
    const partialAmountIn = r[0].pool.partialAmountIn || '0';

    fee = fee.plus(
      r
        .reduce(
          (acc, cur) => acc.plus(cur.pool.fee || cur.pool.total_fee || 0),
          new Big(0)
        )
        .times(partialAmountIn)
        .div(ONLY_ZEROS.test(parsedAmountIn) ? '1' : parsedAmountIn)
    );
  });

  return fee.toNumber();
};

export const getAccountName = (AccountId: string) => {
  if (!AccountId) return AccountId;

  const [account, network] = AccountId.split('.');
  const niceAccountId = `${account.slice(0, 10)}...${network || ''}`;

  return account.length > 10 ? niceAccountId : AccountId;
};

export const symbolsArr = ['e', 'E', '+', '-'];

export const multiply = (factor1: string, factor2: string) => {
  return math.format(math.evaluate(`${factor1} * ${factor2}`), {
    notation: 'fixed',
  });
};

export const toInternationalCurrencySystemLongString = (
  labelValue: string,
  percent?: number
) => {
  return Math.abs(Number(labelValue)) >= 1.0e9
    ? (Math.abs(Number(labelValue)) / 1.0e9).toFixed(percent || 2) + 'B'
    : Math.abs(Number(labelValue)) >= 1.0e6
    ? (Math.abs(Number(labelValue)) / 1.0e6).toFixed(percent || 2) + 'M'
    : Math.abs(Number(labelValue)).toFixed(percent || 2);
};

export const percentOfBigNumber = (
  percent: number,
  num: number | string,
  precision: number
) => {
  const valueBig = math.bignumber(num);
  const percentBig = math.bignumber(percent).div(100);

  return toPrecision(
    scientificNotationToString(valueBig.mul(percentBig).toString()),
    precision
  );
};

export const toRealSymbol = (symbol: string) => {
  if (!symbol) return '';
  const blackList = ['nUSDO'];

  if (symbol === 'nWETH' || symbol === 'WETH') return 'wETH';
  if (blackList.includes(symbol)) return symbol;
  return symbol.charAt(0) === 'n' &&
    symbol.charAt(1) === symbol.charAt(1).toUpperCase()
    ? symbol.substring(1)
    : symbol;
};

export const calculateFeeCharge = (fee: number, total: string) => {
  return math.floor(math.evaluate(`(${fee} / ${FEE_DIVISOR}) * ${total}`), 3);
};

export const calculateFeePercent = (fee: number) => {
  return math.divide(fee, 100);
};

export function getExpectedOutputFromSwapTodos(
  estimates: EstimateSwapView[],
  outputToken: string
) {
  if (!estimates || estimates.length === 0) return new Big(0);

  return estimates
    .filter(item => item.outputToken === outputToken)
    .map(item => new Big(item.estimate || 0))
    .reduce((a, b) => a.plus(b), new Big(0));
}

export const calculateAmountReceived = (
  pool: Pool,
  amountIn: string,
  tokenIn: TokenMetadata,
  tokenOut: TokenMetadata
) => {
  const partialAmountIn = toReadableNumber(tokenIn.decimals, amountIn);

  const in_balance = toReadableNumber(
    tokenIn.decimals,
    pool.supplies[tokenIn.id]
  );
  const out_balance = toReadableNumber(
    tokenOut.decimals,
    pool.supplies[tokenOut.id]
  );

  const big_in_balance = math.bignumber(in_balance);
  const big_out_balance = math.bignumber(out_balance);

  const constant_product = big_in_balance.mul(big_out_balance);

  const new_in_balance = big_in_balance.plus(math.bignumber(partialAmountIn));

  const new_out_balance = constant_product.div(new_in_balance);

  const tokenOutReceived = big_out_balance.minus(new_out_balance);

  return tokenOutReceived;
};

export const calculateMarketPrice = (
  pool: Pool,
  tokenIn: TokenMetadata,
  tokenOut: TokenMetadata
) => {
  const cur_in_balance = toReadableNumber(
    tokenIn.decimals,
    pool.supplies[tokenIn.id]
  );

  const cur_out_balance = toReadableNumber(
    tokenOut.decimals,
    pool.supplies[tokenOut.id]
  );

  return math.evaluate(`(${cur_in_balance} / ${cur_out_balance})`);
};

export const calculateSmartRoutingPriceImpact = (
  tokenInAmount: string,
  swapTodos: EstimateSwapView[],
  tokenIn: TokenMetadata,
  tokenMid: TokenMetadata,
  tokenOut: TokenMetadata,
  stablePools: StablePool[]
) => {
  const isPool1StablePool = isStablePool(stablePools, swapTodos[0].pool.id);
  const isPool2StablePool = isStablePool(stablePools, swapTodos[1].pool.id);

  const marketPrice1 = isPool1StablePool
    ? (
        Number(swapTodos[0].pool.rates?.[tokenMid.id]) /
        Number(swapTodos[0].pool.rates?.[tokenIn.id])
      ).toString()
    : calculateMarketPrice(swapTodos[0].pool, tokenIn, tokenMid);

  const marketPrice2 = isPool2StablePool
    ? (
        Number(swapTodos[1].pool.rates?.[tokenOut.id]) /
        Number(swapTodos[1].pool.rates?.[tokenMid.id])
      ).toString()
    : calculateMarketPrice(swapTodos[1].pool, tokenMid, tokenOut);

  const generalMarketPrice = math.evaluate(`${marketPrice1} * ${marketPrice2}`);

  const tokenMidReceived = isPool1StablePool
    ? swapTodos[0].noFeeAmountOut
    : calculateAmountReceived(
        swapTodos[0].pool,
        toNonDivisibleNumber(tokenIn.decimals, tokenInAmount),
        tokenIn,
        tokenMid
      );

  const formattedTokenMidReceived = scientificNotationToString(
    tokenMidReceived?.toString() || '0'
  );

  let stableOutPool2;
  if (isPool2StablePool) {
    const stablePool2 =
      stablePools.find(p => p.id === swapTodos[1].pool.id) || stablePools[0];

    const stableOut = getSwappedAmount(
      tokenMid.id,
      tokenOut.id,
      formattedTokenMidReceived,
      stablePool2,
      getStablePoolDecimal(stablePool2)
    );
    stableOutPool2 =
      stableOut[0] < 0
        ? '0'
        : toPrecision(scientificNotationToString(stableOut[2].toString()), 0);
    stableOutPool2 = toReadableNumber(
      getStablePoolDecimal(stablePool2),
      stableOutPool2
    );
  }

  const tokenOutReceived = isPool2StablePool
    ? stableOutPool2
    : calculateAmountReceived(
        swapTodos[1].pool,
        toNonDivisibleNumber(tokenMid.decimals, formattedTokenMidReceived),
        tokenMid,
        tokenOut
      );

  const newMarketPrice = math.evaluate(
    `${tokenInAmount} / ${tokenOutReceived}`
  );

  const PriceImpact = new Big(newMarketPrice)
    .minus(new Big(generalMarketPrice))
    .div(newMarketPrice)
    .times(100)
    .toString();

  return scientificNotationToString(PriceImpact);
};
export const percent = (numerator: string, denominator: string) => {
  return math.evaluate(`(${numerator} / ${denominator}) * 100`);
};
export const calcStableSwapPriceImpact = (
  from: string,
  to: string,
  marketPrice: string = '1'
) => {
  const newMarketPrice = math.evaluate(`${from} / ${to}`);

  return math.format(
    percent(
      math.evaluate(`${newMarketPrice} - ${marketPrice}`),
      newMarketPrice
    ),
    {
      notation: 'fixed',
    }
  );
};

export const calculatePriceImpact = (
  pools: Pool[],
  tokenIn: TokenMetadata,
  tokenOut: TokenMetadata,
  tokenInAmount: string
) => {
  let in_balance: string = '0',
    out_balance: string = '0';

  pools.forEach((pool, i) => {
    const cur_in_balance = toReadableNumber(
      tokenIn.decimals,
      pool.supplies[tokenIn.id]
    );

    const cur_out_balance = toReadableNumber(
      tokenOut.decimals,
      pool.supplies[tokenOut.id]
    );

    in_balance = new Big(in_balance).plus(cur_in_balance).toString();
    out_balance = new Big(out_balance).plus(cur_out_balance).toString();
  });

  const finalMarketPrice = math.evaluate(`(${in_balance} / ${out_balance})`);

  const separatedReceivedAmount = pools.map(pool => {
    return calculateAmountReceived(
      pool,
      pool.partialAmountIn || '0',
      tokenIn,
      tokenOut
    );
  });

  const finalTokenOutReceived = math.sum(...separatedReceivedAmount);

  const newMarketPrice = math.evaluate(
    `${tokenInAmount} / ${finalTokenOutReceived}`
  );

  const PriceImpact = new Big(newMarketPrice)
    .minus(new Big(finalMarketPrice))
    .div(newMarketPrice)
    .times(100)
    .toString();

  return scientificNotationToString(PriceImpact);
};

export function calculateSmartRoutesV2PriceImpact(
  actions: any,
  outputToken: string,
  tokenInPara: TokenMetadata,
  stablePools: StablePool[]
) {
  const routes = separateRoutes(actions, outputToken);

  const tokenIn = routes[0][0].tokens?.[0] || tokenInPara;

  const totalInputAmount = routes[0][0].totalInputAmount;

  const priceImpactForRoutes = routes.map((r, i) => {
    const readablePartialAmountIn = toReadableNumber(
      tokenIn.decimals,
      r[0].pool.partialAmountIn
    );

    if (r.length > 1) {
      const tokenIn = r[0].tokens?.[0];
      const tokenMid = r[0].tokens?.[1];
      const tokenOut = r[0].tokens?.[2];

      return calculateSmartRoutingPriceImpact(
        readablePartialAmountIn,
        routes[i],
        tokenIn || tokenInPara,
        tokenMid || tokenInPara,
        tokenOut || tokenInPara,
        stablePools
      );
    } else {
      return isStablePool(stablePools, r[0].pool.id)
        ? calcStableSwapPriceImpact(
            readablePartialAmountIn,
            r[0].noFeeAmountOut || '0',
            (
              Number(r[0].pool.rates?.[outputToken]) /
              Number(r[0].pool.rates?.[tokenIn.id])
            ).toString()
          )
        : calculatePriceImpact(
            [r[0].pool],
            r[0].tokens?.[0] || tokenIn,
            r[0].tokens?.[1] || tokenIn,
            readablePartialAmountIn
          );
    }
  });

  const rawRes = priceImpactForRoutes.reduce(
    (pre, cur, i) => {
      return pre.plus(
        new Big(routes[i][0].pool.partialAmountIn || '0')
          .div(new Big(totalInputAmount || '1'))
          .mul(cur)
      );
    },

    new Big(0)
  );

  return scientificNotationToString(rawRes.toString());
}

export const getPriceImpact = ({
  estimates,
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  stablePools,
}: {
  estimates: EstimateSwapView[];
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: string;
  amountOut: string;
  stablePools: StablePool[];
}) => {
  let PriceImpactValue: string = '0';
  let priceImpactValueSmartRouting: string = '0';
  let priceImpactValueSmartRoutingV2: string = '0';

  if (typeof estimates === 'undefined') return '0';

  try {
    if (estimates?.length === 2 && estimates[0].status === PoolMode.SMART) {
      priceImpactValueSmartRouting = calculateSmartRoutingPriceImpact(
        amountIn,
        estimates,
        tokenIn,
        estimates[0].tokens?.[1] || tokenIn,
        tokenOut,
        stablePools
      );
    } else if (
      estimates?.length === 1 &&
      estimates[0].status === PoolMode.STABLE
    ) {
      priceImpactValueSmartRouting = calcStableSwapPriceImpact(
        toReadableNumber(tokenIn.decimals, estimates[0].totalInputAmount),
        estimates[0].noFeeAmountOut || '0',
        (
          Number(estimates[0].pool.rates?.[tokenOut.id]) /
          Number(estimates[0].pool.rates?.[tokenIn.id])
        ).toString()
      );
    } else priceImpactValueSmartRouting = '0';
  } catch (error) {
    priceImpactValueSmartRouting = '0';
  }

  try {
    priceImpactValueSmartRoutingV2 = calculateSmartRoutesV2PriceImpact(
      estimates,
      tokenOut.id,
      tokenIn,
      stablePools
    );
  } catch (error) {
    priceImpactValueSmartRoutingV2 = '0';
  }

  try {
    if (
      estimates[0].status === PoolMode.SMART ||
      estimates[0].status === PoolMode.STABLE
    ) {
      PriceImpactValue = priceImpactValueSmartRouting;
    } else {
      PriceImpactValue = priceImpactValueSmartRoutingV2;
    }

    return PriceImpactValue;
  } catch (error) {
    return '0';
  }
};

export const subtraction = (initialValue: string, toBeSubtract: string) => {
  return math.format(math.evaluate(`${initialValue} - ${toBeSubtract}`), {
    notation: 'fixed',
  });
};

export function getPoolAllocationPercents(pools: Pool[]) {
  if (pools.length === 1) return ['100'];

  if (pools) {
    const partialAmounts = pools.map(pool => {
      return math.bignumber(pool.partialAmountIn);
    });

    const ps: string[] = new Array(partialAmounts.length).fill('0');

    const sum =
      partialAmounts.length === 1
        ? partialAmounts[0]
        : math.sum(...partialAmounts);

    const sortedAmount = sortBy(partialAmounts, p => Number(p));

    let minIndexes: number[] = [];

    for (let k = 0; k < sortedAmount.length - 1; k++) {
      let minIndex = -1;

      for (let j = 0; j < partialAmounts.length; j++) {
        if (partialAmounts[j].eq(sortedAmount[k]) && !minIndexes.includes(j)) {
          minIndex = j;
          minIndexes.push(j);
          break;
        }
      }
      const res = math
        .round(percent(partialAmounts[minIndex].toString(), sum))
        .toString();

      if (Number(res) === 0) {
        ps[minIndex] = '1';
      } else {
        ps[minIndex] = res;
      }
    }

    const finalPIndex = ps.indexOf('0');

    ps[finalPIndex] = subtraction(
      '100',
      ps.length === 1 ? Number(ps[0]) : math.sum(...ps.map(p => Number(p)))
    ).toString();

    return ps;
  } else {
    return [];
  }
}

export const isMobile = (): boolean => {
  return window.screen.width <= 600;
};
export function divide(numerator: string, denominator: string) {
  return math.format(math.evaluate(`${numerator} / ${denominator}`), {
    notation: 'fixed',
  });
}

export const getMax = function(id: string, amount: string) {
  return id !== WRAP_NEAR_CONTRACT_ID
    ? amount
    : Number(amount) <= 0.5
    ? '0'
    : String(Number(amount) - 0.5);
};

export function getPointByPrice(
  pointDelta: number,
  price: string,
  decimalRate: number,
  noNeedSlot?: boolean
) {
  const point = Math.log(+price * decimalRate) / Math.log(CONSTANT_D);
  const point_int = Math.round(point);
  let point_int_slot = point_int;
  if (!noNeedSlot) {
    point_int_slot = Math.floor(point_int / pointDelta) * pointDelta;
  }
  if (point_int_slot < POINTLEFTRANGE) {
    return POINTLEFTRANGE;
  } else if (point_int_slot > POINTRIGHTRANGE) {
    return 800000;
  }
  return point_int_slot;
}
export const feeToPointDelta = (fee: number) => {
  switch (fee) {
    case 100:
      return 1;
    case 400:
      return 8;
    case 2000:
      return 40;
    case 10000:
      return 200;
    default:
      throw NoFeeToPool(fee);
  }
};

export const priceToPoint = ({
  tokenA,
  tokenB,
  amountA,
  amountB,
  fee,
}: {
  tokenA: TokenMetadata;
  tokenB: TokenMetadata;
  amountA: string;
  amountB: string;
  fee: number;
}) => {
  if (DCL_POOL_FEE_LIST.indexOf(fee) === -1) throw NoFeeToPool(fee);

  const decimal_price_A_by_B = new Big(amountB).div(amountA);
  const undecimal_price_A_by_B = decimal_price_A_by_B
    .times(new Big(10).pow(tokenB.decimals))
    .div(new Big(10).pow(tokenA.decimals));

  const pointDelta = feeToPointDelta(fee);

  const price = decimal_price_A_by_B;

  const decimalRate = new Big(10)
    .pow(tokenB.decimals)
    .div(new Big(10).pow(tokenA.decimals))
    .toNumber();

  return getPointByPrice(
    pointDelta,
    scientificNotationToString(price.toString()),
    decimalRate
  );
};

export const pointToPrice = ({
  tokenA,
  tokenB,
  point,
}: {
  tokenA: TokenMetadata;
  tokenB: TokenMetadata;
  point: number;
}) => {
  const undecimal_price = Math.pow(CONSTANT_D, point);
  const decimal_price_A_by_B = new Big(undecimal_price)
    .times(new Big(10).pow(tokenA.decimals))
    .div(new Big(10).pow(tokenB.decimals));

  return scientificNotationToString(decimal_price_A_by_B.toString());
};

export const registerAccountOnToken = (AccountId: string) => {
  return {
    methodName: 'storage_deposit',
    args: {
      registration_only: true,
      account_id: AccountId,
    },
    gas: '30000000000000',
    amount: STORAGE_TO_REGISTER_WITH_MFT,
  };
};
