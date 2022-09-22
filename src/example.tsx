import * as React from 'react';
import { Transaction, EstimateSwapView } from './types';
import { getStablePoolsDetail, fetchAllRefPools } from './pool';
import { ftGetTokenMetadata } from './ref';
import { estimateSwap } from './swap';
import { SwapOptions } from './swap';
import { instantSwap } from './instantSwap';

export const Thing = () => {
  // const [pools, setPools] = React.useState<any>();

  const tokenInId = '';

  const tokenOutId = '';

  const amountIn = '';

  const slippageTolerance = 0.01;

  // fetch pool to get estimate

  const getEstimate = async () => {
    const { simplePools, ratedPools, unRatedPools } = await fetchAllRefPools();

    const stablePools = ratedPools.concat(unRatedPools);

    const stablePoolsDetail = await getStablePoolsDetail(stablePools);

    const tokenIn = await ftGetTokenMetadata(tokenInId);

    const tokenOut = await ftGetTokenMetadata(tokenOutId);

    const options: SwapOptions = {
      smartRouting: true,
      stablePools,
      stablePoolsDetail,
    };

    return estimateSwap({
      tokenIn,
      tokenOut,
      amountIn,
      simplePools,
      options,
    });
  };

  // generate transactions
  const getTransactions = async (swapTodos: EstimateSwapView[]) => {
    const tokenIn = await ftGetTokenMetadata(tokenInId);

    const tokenOut = await ftGetTokenMetadata(tokenOutId);

    return await instantSwap({
      tokenIn,
      tokenOut,
      amountIn,
      swapTodos,
      slippageTolerance,
    });
  };

  React.useEffect(() => {
    getEstimate()
      .then(swapTodos => {
        getTransactions(swapTodos).then((transactions: Transaction[]) => {
          console.log(transactions);
        });
      })
      .catch(err => {
        console.error(err);
      });
  }, [tokenInId, tokenOutId, amountIn]);

  // sign and send transactions

  return <div>the snozzberries taste like snozzberries</div>;
};
