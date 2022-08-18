import { Pool, PoolRPCView, StablePool, SmartRoutingInputPool } from './types';
import {
  RATED_POOL_LP_TOKEN_DECIMALS,
  STABLE_LP_TOKEN_DECIMALS,
} from './constant';

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
  tokenId: string
) => {
  return stablePools
    .map(p => p.token_account_ids)
    .flat()
    .includes(tokenId);
};

export const getStablePoolDecimal = (stablePool: StablePool) => {
  return stablePool.pool_kind === 'RATED_SWAP'
    ? RATED_POOL_LP_TOKEN_DECIMALS
    : STABLE_LP_TOKEN_DECIMALS;
};
