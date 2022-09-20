import { TokenMetadata, Pool, StablePool, EstimateSwapView } from './types';
import {
  toReadableNumber,
  toNonDivisibleNumber,
  scientificNotationToString,
} from './number';
import Big from 'big.js';
import { SameInputTokenError, ZeroInputError, NoPoolError } from './error';
import { ONLY_ZEROS, toPrecision } from './number';
import _ from 'lodash';
import { FEE_DIVISOR } from './constant';
import { fetchAllRefPools } from './pool';
import { getSwappedAmount } from './stable-swap';
import { ftGetTokenMetadata, ftGetTokensMetadata } from './ref';
import { isStablePool } from './utils';
import {
  getStablePoolDecimal,
  isStablePoolToken,
  poolFormatter,
} from './utils';
import {
  getSmartRouteSwapActions,
  stableSmart,
  getExpectedOutputFromActionsORIG,
  //@ts-ignore
} from './smartRoutingLogic.js';

// core function

export interface SwapParams {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: string;
  simplePools: Pool[];
  options?: SwapOptions;
}

export interface SwapOptions {
  smartRouting?: boolean;
  stablePools?: Pool[];
  stablePoolsDetail?: StablePool[];
}

export const getSimplePoolEstimate = ({
  tokenIn,
  tokenOut,
  pool,
  amountIn,
}: {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  pool: Pool;
  amountIn: string;
}) => {
  const amount_with_fee = Number(amountIn) * (FEE_DIVISOR - pool.fee);
  const in_balance = toReadableNumber(
    tokenIn.decimals,
    pool.supplies[tokenIn.id]
  );
  const out_balance = toReadableNumber(
    tokenOut.decimals,
    pool.supplies[tokenOut.id]
  );
  const estimate = new Big(
    (
      (amount_with_fee * Number(out_balance)) /
      (FEE_DIVISOR * Number(in_balance) + amount_with_fee)
    ).toString()
  ).toFixed();

  return {
    token: tokenIn,
    estimate,
    pool,
    outputToken: tokenOut.id,
    inputToken: tokenIn.id,
  };
};

export const getStablePoolEstimate = ({
  tokenIn,
  tokenOut,
  amountIn,
  stablePool,
}: {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: string;
  stablePool: StablePool;
}) => {
  const STABLE_LP_TOKEN_DECIMALS = getStablePoolDecimal(stablePool);

  console.log(amountIn, 'amount in stable pool estimate');

  const [amount_swapped, fee, dy] = getSwappedAmount(
    tokenIn.id,
    tokenOut.id,
    amountIn,
    stablePool,
    STABLE_LP_TOKEN_DECIMALS
  );

  const amountOut =
    amount_swapped < 0 || isNaN(amount_swapped)
      ? '0'
      : toPrecision(scientificNotationToString(amount_swapped.toString()), 0);

  const dyOut =
    amount_swapped < 0 || isNaN(amount_swapped) || isNaN(dy)
      ? '0'
      : toPrecision(scientificNotationToString(dy.toString()), 0);

  console.log(amountOut, dyOut, amount_swapped);

  return {
    estimate: toReadableNumber(STABLE_LP_TOKEN_DECIMALS, amountOut),
    noFeeAmountOut: toReadableNumber(STABLE_LP_TOKEN_DECIMALS, dyOut),
    pool: stablePool,
    token: tokenIn,
    outputToken: tokenOut.id,
    inputToken: tokenIn.id,
  };
};

/**
 * @description Get the estimate of the amount of tokenOut that can be received
 *
 */
export const singlePoolSwap = ({
  tokenIn,
  tokenOut,
  simplePools,
  amountIn,
  stablePools,
}: {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  simplePools: Pool[];
  amountIn: string;
  stablePools?: StablePool[];
}) => {
  if (!simplePools || simplePools.length === 0) {
    throw NoPoolError;
  }

  // const pools = simplePools.concat(stablePools);

  const simplePoolsThisPair = simplePools.filter(
    p => p.tokenIds.includes(tokenIn.id) && p.tokenIds.includes(tokenOut.id)
  );

  const estimatesSimplePool = simplePoolsThisPair.map(pool =>
    getSimplePoolEstimate({
      tokenIn,
      tokenOut,
      pool,
      amountIn,
    })
  );

  const stablePoolThisPair = stablePools?.filter(
    sp =>
      sp.token_account_ids.includes(tokenIn.id) &&
      sp.token_account_ids.includes(tokenOut.id)
  );

  // different stable lp token decimal for different type of pools
  const estimatesStablePool = stablePoolThisPair?.map(stablePool =>
    getStablePoolEstimate({
      tokenIn,
      tokenOut,
      amountIn,
      stablePool,
    })
  );

  const maxSimplePoolEstimate =
    estimatesSimplePool.length === 1
      ? estimatesSimplePool[0]
      : _.maxBy(estimatesSimplePool, estimate => Number(estimate.estimate));

  if (!estimatesStablePool) return maxSimplePoolEstimate;

  const maxStablePoolEstimate =
    estimatesStablePool.length === 1
      ? estimatesStablePool[0]
      : _.maxBy(estimatesStablePool, estimate => Number(estimate.estimate));

  return Number(maxSimplePoolEstimate?.estimate) >
    Number(maxSimplePoolEstimate?.estimate)
    ? maxSimplePoolEstimate
    : maxStablePoolEstimate;
};

export const getStablePoolsThisPair = ({
  tokenInId,
  tokenOutId,
  stablePools,
}: {
  tokenInId: string;
  tokenOutId: string;
  stablePools: Pool[];
}) => {
  return stablePools.filter(
    p =>
      p.tokenIds.includes(tokenInId) &&
      p.tokenIds.includes(tokenOutId) &&
      tokenInId !== tokenOutId
  );
};

export const getPoolsByTokens = ({
  pools,
  tokenInId,
  tokenOutId,
}: {
  pools: Pool[];
  tokenInId: string;
  tokenOutId: string;
}) => {
  if (tokenInId === tokenOutId) return [];

  return pools.filter(
    p => p.tokenIds.includes(tokenInId) && p.tokenIds.includes(tokenOutId)
  );
};

export const getPoolEstimate = async ({
  tokenIn,
  tokenOut,
  amountIn,
  stablePoolDetail,
  pool,
}: {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: string;
  pool: Pool;
  stablePoolDetail?: StablePool;
}) => {
  if (!!stablePoolDetail) {
    return getStablePoolEstimate({
      tokenIn,
      tokenOut,
      stablePool: stablePoolDetail,
      amountIn,
    });
  } else {
    return getSimplePoolEstimate({
      tokenIn,
      tokenOut,
      pool,
      amountIn,
    });
  }
};

export async function getHybridStableSmart(
  tokenIn: TokenMetadata,
  tokenOut: TokenMetadata,
  amountIn: string,
  stablePools: Pool[],
  stablePoolsDetail: StablePool[],
  simplePools: Pool[]
) {
  if (
    !isStablePoolToken(stablePoolsDetail, tokenIn.id) &&
    !isStablePoolToken(stablePoolsDetail, tokenOut.id)
  ) {
    return { actions: [], estimate: '0' };
  }

  const stablePoolsDetailById = stablePoolsDetail.reduce((acc, cur) => {
    return {
      ...acc,
      [cur.id]: cur,
    };
  }, {} as Record<string, StablePool>);

  const parsedAmountIn = toNonDivisibleNumber(tokenIn.decimals, amountIn);

  let pool1: Pool, pool2: Pool;

  let pools1: Pool[] = [];
  let pools2: Pool[] = [];

  let pools1Right: Pool[] = [];
  let pools2Right: Pool[] = [];

  let candidatePools: Pool[][] = [];

  /**
   * find possible routes for this pair
   *
   *
   */

  console.log(stablePoolsDetail, 'stablepools detail');

  if (isStablePoolToken(stablePoolsDetail, tokenIn.id)) {
    // first hop will be through stable pool.
    pools1 = stablePools.filter(pool => pool.tokenIds.includes(tokenIn.id));

    const otherStables = pools1
      .map(pool => pool.tokenIds.filter(id => id !== tokenIn.id))
      .flat();

    for (var otherStable of otherStables) {
      let stablePoolsThisPair = getStablePoolsThisPair({
        tokenInId: otherStable,
        tokenOutId: tokenOut.id,
        stablePools,
      });

      let tmpPools = getPoolsByTokens({
        tokenInId: otherStable,
        tokenOutId: tokenOut.id,
        pools: simplePools,
      });
      const tobeAddedPools = tmpPools.concat(stablePoolsThisPair);
      pools2.push(
        ...tobeAddedPools.filter(p => {
          const supplies = Object.values(p.supplies);
          return new Big(supplies[0]).times(new Big(supplies[1])).gt(0);
        })
      );
    }
  }

  if (isStablePoolToken(stablePoolsDetail, tokenOut.id)) {
    // second hop will be through stable pool.
    pools2Right = stablePools.filter(pool =>
      pool.tokenIds.includes(tokenOut.id)
    );

    const otherStables = pools2Right
      .map(pool => pool.tokenIds.filter(id => id !== tokenOut.id))
      .flat();
    for (var otherStable of otherStables) {
      let stablePoolsThisPair = getStablePoolsThisPair({
        tokenInId: tokenIn.id,
        tokenOutId: otherStable,
        stablePools,
      });

      let tmpPools = getPoolsByTokens({
        tokenInId: tokenIn.id,
        tokenOutId: otherStable,
        pools: simplePools,
      });

      const tobeAddedPools = tmpPools.concat(stablePoolsThisPair);

      pools1Right.push(
        ...tobeAddedPools.filter(p => {
          const supplies = Object.values(p.supplies);
          return new Big(supplies[0]).times(new Big(supplies[1])).gt(0);
        })
      );
    }
  }

  console.log(pools1, pools2);

  // find candidate pools

  for (let p1 of pools1) {
    let middleTokens = p1.tokenIds.filter((id: string) => id !== tokenIn.id);
    for (let middleToken of middleTokens) {
      let p2s = pools2.filter(
        p =>
          p.tokenIds.includes(middleToken) &&
          p.tokenIds.includes(tokenOut.id) &&
          middleToken !== tokenOut.id
      );
      let p2 = _.maxBy(p2s, p =>
        Number(
          new Big(toReadableNumber(tokenOut.decimals, p.supplies[tokenOut.id]))
        )
      );

      if (middleToken === tokenOut.id) {
        p2 = p1;
      }

      if (p1 && p2) {
        if (p1.id === p2.id) candidatePools.push([p1]);
        else candidatePools.push([p1, p2]);
      }
    }
  }
  for (let p1 of pools1Right) {
    let middleTokens = p1.tokenIds.filter((id: string) => id !== tokenIn.id);
    for (let middleToken of middleTokens) {
      let p2s = pools2Right.filter(
        p =>
          p.tokenIds.includes(middleToken) &&
          p.tokenIds.includes(tokenOut.id) &&
          middleToken !== tokenOut.id
      );
      let p2 = _.maxBy(p2s, p =>
        Number(
          new Big(toReadableNumber(tokenOut.decimals, p.supplies[tokenOut.id]))
        )
      );

      if (middleToken === tokenOut.id) {
        p2 = p1;
      }

      if (p1 && p2) {
        if (p1.id === p2.id) candidatePools.push([p1]);
        else candidatePools.push([p1, p2]);
      }
    }
  }

  console.log(candidatePools, 'candpools');

  if (candidatePools.length > 0) {
    const tokensMedata = await ftGetTokensMetadata(
      candidatePools.map(cp => cp.map(p => p.tokenIds).flat()).flat()
    );

    const BestPoolPair =
      candidatePools.length === 1
        ? candidatePools[0]
        : _.maxBy(candidatePools, poolPair => {
            // only one pool case, only for stable tokens
            if (poolPair.length === 1) {
              if (isStablePool(stablePoolsDetail, poolPair[0].id)) {
                const stablePoolThisPair = getStablePoolsThisPair({
                  tokenInId: tokenIn.id,
                  tokenOutId: tokenOut.id,
                  stablePools,
                })[0];

                const stablePoolDetailThisPair = stablePoolsDetail.find(
                  spd => spd.id === stablePoolThisPair.id
                );

                return Number(
                  getStablePoolEstimate({
                    tokenIn,
                    tokenOut,
                    stablePool: stablePoolDetailThisPair as StablePool,
                    amountIn,
                  }).estimate
                );
              } else {
                return Number(
                  getSimplePoolEstimate({
                    tokenIn,
                    tokenOut,
                    amountIn,
                    pool: poolPair[0],
                  }).estimate
                );
              }
            }

            const [tmpPool1, tmpPool2] = poolPair;
            const tokenMidId = poolPair[0].tokenIds.find((t: string) =>
              poolPair[1].tokenIds.includes(t)
            ) as string;

            const tokenMidMeta = tokensMedata[tokenMidId];

            const estimate1 = {
              ...(isStablePool(stablePoolsDetail, tmpPool1.id)
                ? getStablePoolEstimate({
                    tokenIn,
                    tokenOut: tokenMidMeta,
                    amountIn,
                    stablePool: stablePoolsDetailById[tmpPool1.id],
                  })
                : getSimplePoolEstimate({
                    tokenIn,
                    tokenOut: tokenMidMeta,
                    amountIn,
                    pool: tmpPool1,
                  })),
            };

            const estimate2 = {
              ...(isStablePool(stablePoolsDetail, tmpPool2.id)
                ? getStablePoolEstimate({
                    tokenIn: tokenMidMeta,
                    tokenOut,
                    amountIn: estimate1.estimate,
                    stablePool: stablePoolsDetailById[tmpPool2.id],
                  })
                : getSimplePoolEstimate({
                    tokenIn: tokenMidMeta,
                    tokenOut,
                    pool: tmpPool2,
                    amountIn: estimate1.estimate,
                  })),
            };

            console.log(
              poolPair[0].id,
              poolPair[1].id,
              estimate1.estimate,
              estimate2.estimate,
              tmpPool1,
              tokenMidId,
              isStablePool(stablePoolsDetail, tmpPool1.id),
              isStablePool(stablePoolsDetail, tmpPool2.id)
            );

            return Number(estimate2.estimate);
          });

    console.log(BestPoolPair, 'best pool pair');
    // one pool case only get best price

    if (!BestPoolPair) return { actions: [], estimate: '0' };

    if (BestPoolPair.length === 1) {
      const bestPool = BestPoolPair[0];
      const estimate = await getPoolEstimate({
        tokenIn,
        tokenOut,
        amountIn,
        pool: bestPool,
        stablePoolDetail: stablePoolsDetailById[bestPool.id],
      });

      return {
        actions: [
          {
            ...estimate,
            pool: { bestPool, parsedAmountIn: parsedAmountIn },
            tokens: [tokenIn, tokenOut],
            inputToken: tokenIn.id,
            outputToken: tokenOut.id,
            totalInputAmount: toNonDivisibleNumber(tokenIn.decimals, amountIn),
          },
        ],
        estimate: estimate.estimate,
      };
    }

    // two pool case get best price
    [pool1, pool2] = BestPoolPair;

    const tokenMidId = BestPoolPair[0].tokenIds.find((t: string) =>
      BestPoolPair[1].tokenIds.includes(t)
    ) as string;

    const tokenMidMeta = await ftGetTokenMetadata(tokenMidId);

    const estimate1 = {
      ...(isStablePool(stablePoolsDetail, pool1.id)
        ? getStablePoolEstimate({
            tokenIn,
            tokenOut: tokenMidMeta,
            amountIn,
            stablePool: stablePoolsDetailById[pool1.id],
          })
        : getSimplePoolEstimate({
            tokenIn,
            tokenOut: tokenMidMeta,
            amountIn,
            pool: pool1,
          })),
      partialAmountIn: parsedAmountIn,
      tokens: [tokenIn, tokenMidMeta, tokenOut],
      inputToken: tokenIn.id,
      outputToken: tokenMidMeta.id,
    };

    const estimate2 = {
      ...(isStablePool(stablePoolsDetail, pool2.id)
        ? getStablePoolEstimate({
            tokenIn: tokenMidMeta,
            tokenOut,
            amountIn: estimate1.estimate,
            stablePool: stablePoolsDetailById[pool2.id],
          })
        : getSimplePoolEstimate({
            tokenIn: tokenMidMeta,
            tokenOut,
            amountIn: estimate1.estimate,
            pool: pool2,
          })),

      tokens: [tokenIn, tokenMidMeta, tokenOut],
      inputToken: tokenMidMeta.id,
      outputToken: tokenOut.id,
    };

    return { actions: [estimate1, estimate2], estimate: estimate2.estimate };
  }

  return { actions: [], estimate: '0' };
}

// simple pools and stable pools for this pair
export const estimateSwap = async ({
  tokenIn,
  tokenOut,
  amountIn,
  simplePools,
  options,
}: SwapParams) => {
  if (tokenIn.id === tokenOut.id) throw SameInputTokenError;

  if (ONLY_ZEROS.test(amountIn)) throw ZeroInputError;

  const { smartRouting, stablePools, stablePoolsDetail } = options || {};

  const parsedAmountIn = toNonDivisibleNumber(tokenIn.decimals, amountIn);

  if (!smartRouting) {
    const estimate = singlePoolSwap({
      tokenIn,
      tokenOut,
      simplePools,
      amountIn,
      stablePools: stablePoolsDetail,
    });

    return [
      {
        ...estimate,
        pool: { ...estimate?.pool, partialAmountIn: parsedAmountIn },
      },
    ] as EstimateSwapView[];
  } else {
    const inputPools = simplePools.map(p => poolFormatter(p));

    const simplePoolSmartRoutingActions = await stableSmart(
      inputPools,
      tokenIn.id,
      tokenOut.id,
      parsedAmountIn
    );

    const simplePoolSmartRoutingEstimate = getExpectedOutputFromActionsORIG(
      simplePoolSmartRoutingActions,
      tokenOut.id
    ).toString();

    console.log(simplePoolSmartRoutingEstimate, simplePoolSmartRoutingActions);

    const hybridSmartRoutingRes = await getHybridStableSmart(
      tokenIn,
      tokenOut,
      amountIn,
      stablePools || [],
      stablePoolsDetail || [],
      simplePools
    );

    const hybridSmartRoutingEstimate = hybridSmartRoutingRes.estimate.toString();

    console.log(hybridSmartRoutingEstimate, hybridSmartRoutingRes);

    if (
      new Big(simplePoolSmartRoutingEstimate || '0').gte(
        hybridSmartRoutingEstimate || '0'
      )
    ) {
      if (!simplePoolSmartRoutingActions?.length) return NoPoolError;
      return simplePoolSmartRoutingActions as EstimateSwapView[];
    } else {
      return hybridSmartRoutingRes.actions as EstimateSwapView[];
    }
  }
};
