import _ from 'lodash';
import Big from 'big.js';
import { TokenMetadata, Pool, EstimateSwapView } from '../types';
import { DCL_POOL_FEE_LIST, getDCLPoolId } from '../dcl-swap/dcl-pool';
import { DCLSwap } from '../dcl-swap/swap';
import { estimateSwap, SwapOptions } from '../v1-swap/swap';
import { instantSwap } from '../v1-swap/instantSwap';
import { quote } from '../dcl-swap/swap';
import { NoPoolOnThisPair } from '../error';
import {
  toReadableNumber,
  getExpectedOutputFromSwapTodos,
  percentLess,
} from '../utils';
interface IEstimateInfo {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: string;
  dclEstimate: {
    bestFee: number;
    bestEstimate: {
      amount: string;
      tag: string;
    };
    bestEstimateAmount: string;
  } | null;
  v1Estimate: EstimateSwapView[];
  bestDex: 'v1' | 'dcl' | '';
  bestAmountOut: string;
  dclSwapError?: Error;
  swapError?: Error;
}
interface IDclOptions {
  fee: number;
  poolExist: boolean;
}
export async function estimate({
  tokenIn,
  tokenOut,
  amountIn,
  simplePools,
  options,
  dclOptions,
}: {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: string;
  simplePools: Pool[];
  options?: SwapOptions;
  dclOptions?: IDclOptions;
}): Promise<IEstimateInfo> {
  const estimateResultTodo: any = {
    tokenIn,
    tokenOut,
    amountIn,
  };

  // dcl estimate
  let dclSwapError: Error | null = null;
  let estimates;
  if (!dclOptions) {
    estimates = await Promise.all(
      DCL_POOL_FEE_LIST.map(async fee => {
        const pool_id = getDCLPoolId(tokenIn.id, tokenOut.id, fee);
        return quote({
          pool_ids: [pool_id],
          input_token: tokenIn,
          output_token: tokenOut,
          input_amount: amountIn,
          tag: `${tokenIn.id}-${fee}-${amountIn}`,
        }).catch(e => null);
      })
    );
  } else if (dclOptions.poolExist && dclOptions.fee) {
    const pool_id = getDCLPoolId(tokenIn.id, tokenOut.id, dclOptions?.fee);
    const r = await quote({
      pool_ids: [pool_id],
      input_token: tokenIn,
      output_token: tokenOut,
      input_amount: amountIn,
      tag: `${tokenIn.id}-${dclOptions?.fee}-${amountIn}`,
    }).catch(e => null);
    estimates = [r];
  }

  if (!estimates || estimates.every(e => e === null)) {
    estimateResultTodo['dclEstimate'] = null;
    estimateResultTodo['dclSwapError'] = NoPoolOnThisPair(
      tokenIn.id,
      tokenOut.id
    );
  } else {
    const bestEstimate =
      estimates && estimates?.some(e => !!e)
        ? _.maxBy(estimates, e => Number(!e || !e.tag ? -1 : e.amount))
        : null;
    const bestFee =
      bestEstimate &&
      bestEstimate.tag &&
      bestEstimate?.tag?.split('-')?.slice(-2, -1)?.[0] &&
      Number(bestEstimate?.tag?.split('-')?.slice(-2, -1)?.[0]);
    estimateResultTodo['dclEstimate'] = {
      bestFee,
      bestEstimate,
      bestEstimateAmount: toReadableNumber(
        tokenOut.decimals,
        bestEstimate.amount
      ),
    };
  }

  // v1 estimate
  let swapError: Error | null = null;
  const v1EstimateResult = await estimateSwap({
    tokenIn,
    tokenOut,
    amountIn,
    simplePools: simplePools,
    options: options,
  }).catch((e: any) => {
    estimateResultTodo['swapError'] = e;
    return [];
  });
  if (dclSwapError && swapError) {
    return estimateResultTodo;
  }

  estimateResultTodo['v1Estimate'] = v1EstimateResult;
  const expectAmountOut = getExpectedOutputFromSwapTodos(
    v1EstimateResult,
    tokenOut.id
  ).toString();

  // compare to get best estimate
  if (
    Big(estimateResultTodo['dclEstimate']?.bestEstimateAmount || 0).gt(
      expectAmountOut || 0
    )
  ) {
    estimateResultTodo['bestDex'] = 'dcl';
    estimateResultTodo['bestAmountOut'] =
      estimateResultTodo['dclEstimate']?.bestEstimateAmount;
  } else if (swapError == null && Big(expectAmountOut).gt(0)) {
    estimateResultTodo['bestDex'] = 'v1';
    estimateResultTodo['bestAmountOut'] = expectAmountOut;
  } else {
    estimateResultTodo['bestDex'] = '';
    estimateResultTodo['bestAmountOut'] = '0';
  }
  return estimateResultTodo as IEstimateInfo;
}

export async function swap({
  estimateInfo,
  slippageTolerance,
  AccountId,
  referralId,
}: {
  estimateInfo: IEstimateInfo;
  slippageTolerance: number;
  AccountId: string;
  referralId?: string;
}) {
  if (estimateInfo['bestDex'] === 'v1') {
    const transactionsRef = await instantSwap({
      tokenIn: estimateInfo.tokenIn,
      tokenOut: estimateInfo.tokenOut,
      amountIn: estimateInfo.amountIn,
      swapTodos: estimateInfo['v1Estimate'],
      slippageTolerance,
      AccountId: AccountId || '',
      referralId,
    });
    return transactionsRef;
  }
  if (estimateInfo['bestDex'] === 'dcl') {
    const transactionsDcl = await DCLSwap({
      swapInfo: {
        tokenA: estimateInfo.tokenIn,
        tokenB: estimateInfo.tokenOut,
        amountA: estimateInfo.amountIn,
      },
      Swap: {
        pool_ids: [
          getDCLPoolId(
            estimateInfo.tokenIn.id,
            estimateInfo.tokenOut.id,
            estimateInfo['dclEstimate']?.bestFee || 0
          ),
        ],
        min_output_amount: percentLess(
          slippageTolerance,
          estimateInfo['dclEstimate']?.bestEstimate?.amount || '0'
        ),
      },
      AccountId,
    });
    return transactionsDcl;
  }
  return null;
}
