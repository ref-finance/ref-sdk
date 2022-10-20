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

import BN from 'bn.js';

import * as math from 'mathjs';
import { REF_FI_CONTRACT_ID } from './constant';
import Big from 'big.js';
import { SignAndSendTransactionsParams } from '@near-wallet-selector/core/lib/wallet';

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

  return { transactions: parsedTransactions } as SignAndSendTransactionsParams;
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
        .reduce((acc, cur) => acc.plus(cur.pool.fee || 0), new Big(0))
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
  return estimates
    .filter(item => item.outputToken === outputToken)
    .map(item => new Big(item.estimate))
    .reduce((a, b) => a.plus(b), new Big(0));
}
