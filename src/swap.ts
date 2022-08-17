import { TokenMetadata, Pool } from './types';
import {
  toReadableNumber,
  toNonDivisibleNumber,
  scientificNotationToString,
} from './number';
import Big from 'big.js';
import { StablePool } from './types';
import { SameInputTokenError, ZeroInputError, NoPoolError } from './error';
import { ONLY_ZEROS } from './number';
import _ from 'lodash';
import { FEE_DIVISOR } from './constant';
import { fetchAllRefPools } from './pool';

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

export const getSinglePoolEstimate = (
  tokenIn: TokenMetadata,
  tokenOut: TokenMetadata,
  pool: Pool,
  tokenInAmount: string
) => {
  const amount_with_fee = Number(tokenInAmount) * (FEE_DIVISOR - pool.fee);
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

/**
 * @description Get the estimate of the amount of tokenOut that can be received
 *
 */
export const noSmartRoutingSimplePool = ({
  tokenIn,
  tokenOut,
  simplePools,
  amountIn,
}: {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  simplePools: Pool[];
  amountIn: string;
}) => {
  if (!simplePools || simplePools.length === 0) {
    throw NoPoolError;
  }

  const estimates = simplePools.map(p =>
    getSinglePoolEstimate(tokenIn, tokenOut, p, amountIn)
  );

  return _.maxBy(estimates, estimate => Number(estimate.estimate));
};

export const swap = ({
  tokenIn,
  tokenOut,
  amountIn,
  simplePools,
  options,
}: SwapParams) => {
  if (tokenIn.id === tokenOut.id) throw SameInputTokenError;

  if (ONLY_ZEROS.test(amountIn)) throw ZeroInputError;

  const { smartRouting, stablePools } = options;

  const includeStablePools = !!stablePools && stablePools.length > 0;

  // const parsedAmountIn = toNonDivisibleNumber(tokenIn.decimals, amountIn);

  if (!smartRouting && !includeStablePools) {
    const candidatePools = simplePools.filter(
      pool =>
        pool.tokenIds.includes(tokenIn.id) &&
        pool.tokenIds.includes(tokenOut.id)
    );

    return noSmartRoutingSimplePool({
      tokenIn,
      tokenOut,
      simplePools: candidatePools,
      amountIn,
    });
  } else if (smartRouting && !includeStablePools) {
    // TODO: smart routing case
  }

  // TODO: define return type
  return [];
};

// entry to call swap
export const callSwap = async (params: SwapParams) => {
  // call
  // fetch pool
  // swap(params);
  // const { simplePools, stablePools, ratedPools } = await fetchAllRefPools();
};
