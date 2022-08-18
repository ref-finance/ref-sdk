import { TokenMetadata, Pool } from './types';
import {
  toReadableNumber,
  toNonDivisibleNumber,
  scientificNotationToString,
} from './number';
import Big from 'big.js';
import { StablePool } from './types';
import { SameInputTokenError, ZeroInputError, NoPoolError } from './error';
import { ONLY_ZEROS, toPrecision } from './number';
import _ from 'lodash';
import { FEE_DIVISOR } from './constant';
import { fetchAllRefPools } from './pool';
import { getSwappedAmount } from './stable-swap';
import { getStablePoolDecimal } from './utils';

// core function

export interface SwapParams {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: string;
  simplePools: Pool[];
  options: SwapOptions;
}

export interface SwapOptions {
  smartRouting?: boolean;
  stablePools?: StablePool[];
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

  const [amount_swapped, fee, dy] = getSwappedAmount(
    tokenIn.id,
    tokenOut.id,
    amountIn,
    stablePool,
    STABLE_LP_TOKEN_DECIMALS
  );

  const amountOut =
    amount_swapped < 0
      ? '0'
      : toPrecision(scientificNotationToString(amount_swapped.toString()), 0);

  const dyOut =
    amount_swapped < 0
      ? '0'
      : toPrecision(scientificNotationToString(dy.toString()), 0);

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

  const estimatesSimplePool = simplePools.map(pool =>
    getSimplePoolEstimate({
      tokenIn,
      tokenOut,
      pool,
      amountIn,
    })
  );

  // different stable lp token decimal for different type of pools
  const estimatesStablePool = stablePools?.map(stablePool =>
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

// simple pools and stable pools for this pair
export const estimateSwap = ({
  tokenIn,
  tokenOut,
  amountIn,
  simplePools,
  options,
}: SwapParams) => {
  if (tokenIn.id === tokenOut.id) throw SameInputTokenError;

  if (ONLY_ZEROS.test(amountIn)) throw ZeroInputError;

  const { smartRouting, stablePools } = options;

  // const parsedAmountIn = toNonDivisibleNumber(tokenIn.decimals, amountIn);

  if (!smartRouting) {
    return singlePoolSwap({
      tokenIn,
      tokenOut,
      simplePools,
      amountIn,
      stablePools,
    });
  } else {
    // smart routing algorithm, get estimates on simple pools, get hybrid estimate on stable pools
  }
};

// entry to call swap
