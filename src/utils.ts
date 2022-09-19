import { Pool, PoolRPCView, StablePool, SmartRoutingInputPool } from './types';
import {
  RATED_POOL_LP_TOKEN_DECIMALS,
  STABLE_LP_TOKEN_DECIMALS,
} from './constant';

import { utils } from 'near-api-js';

import BN from 'bn.js';

import * as math from 'mathjs';

export const parsePool = (pool: PoolRPCView, id?: number): Pool => ({
  id: Number(id && id >= 0 ? id : pool.id),
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

export const getGas = (gas: string) =>
  gas ? new BN(gas) : new BN('100000000000000');

export const getAmount = (amount: string) =>
  amount ? new BN(utils.format.parseNearAmount(amount) || '0') : new BN('0');
