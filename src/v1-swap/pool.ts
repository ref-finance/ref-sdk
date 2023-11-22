import { getTotalPools, refFiViewFunction } from '../ref';
import { Pool, PoolRPCView } from '../types';
import { parsePool, toNonDivisibleNumber } from '../utils';
import { STABLE_LP_TOKEN_DECIMALS } from '../constant';

let DEFAULT_PAGE_LIMIT = 100;
const BLACK_TOKEN_LIST = ['meta-token.near'];

export const getRatedPoolDetail = async ({ id }: { id: string | number }) => {
  return refFiViewFunction({
    methodName: 'get_rated_pool',
    args: { pool_id: Number(id) },
  }).then(pool_info => ({
    ...pool_info,
    id: Number(id),
    pool_kind: 'RATED_SWAP',
  }));
};

export const getUnRatedPoolDetail = async ({ id }: { id: string | number }) => {
  return refFiViewFunction({
    methodName: 'get_stable_pool',
    args: { pool_id: Number(id) },
  }).then(pool_info => ({
    ...pool_info,
    id: Number(id),
    pool_kind: 'STABLE_SWAP',
    rates: pool_info.c_amounts.map((_: any) =>
      toNonDivisibleNumber(STABLE_LP_TOKEN_DECIMALS, '1')
    ),
  }));
};

export const getStablePools = async (stablePools: Pool[]) => {
  return Promise.all(
    stablePools.map(pool =>
      pool.pool_kind === 'RATED_SWAP'
        ? getRatedPoolDetail({ id: pool.id })
        : getUnRatedPoolDetail({ id: pool.id })
    )
  );
};

export const getPool = async (id: number): Promise<Pool> => {
  return await refFiViewFunction({
    methodName: 'get_pool',
    args: { pool_id: id },
  }).then((pool: PoolRPCView) => parsePool(pool, id));
};

export const getPoolByIds = async (ids: number[]): Promise<Pool[]> => {
  return await refFiViewFunction({
    methodName: 'get_pool_by_ids',
    args: { pool_ids: ids },
  }).then((pools: PoolRPCView[]) => pools.map((p, i) => parsePool(p, ids[i])));
};

export const getRefPools = async (
  page: number = 1,
  perPage: number = DEFAULT_PAGE_LIMIT
): Promise<Pool[]> => {
  const index = (page - 1) * perPage;
  const poolData: PoolRPCView[] = await refFiViewFunction({
    methodName: 'get_pools',
    args: { from_index: index, limit: perPage },
  });
  return poolData
    .map((rawPool, i) => parsePool(rawPool, i + index))
    .filter(
      p => !p.tokenIds?.find(tokenId => BLACK_TOKEN_LIST.includes(tokenId))
    );
};

export const fetchAllPools = async (perPage?: number) => {
  if (perPage) {
    DEFAULT_PAGE_LIMIT = Math.min(perPage, 500);
  }
  const totalPools = await getTotalPools();
  const pages = Math.ceil(totalPools / DEFAULT_PAGE_LIMIT);
  const pools = (
    await Promise.all(
      [...Array(pages)].fill(0).map((_, i) => getRefPools(i + 1))
    )
  ).flat() as Pool[];
  return {
    simplePools: pools.filter(
      p => p.pool_kind && p.pool_kind === 'SIMPLE_POOL'
    ),
    unRatedPools: pools.filter(
      p => p.pool_kind && p.pool_kind === 'STABLE_SWAP'
    ),
    ratedPools: pools.filter(p => p.pool_kind && p.pool_kind === 'RATED_SWAP'),
  };
};
