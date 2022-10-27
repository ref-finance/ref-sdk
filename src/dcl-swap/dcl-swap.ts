import { TokenMetadata, Transaction } from '../types';

import {
  priceToPoint,
  toNonDivisibleNumber,
  toPrecision,
  registerAccountOnToken,
} from '../utils';
import { ONE_YOCTO_NEAR, WRAP_NEAR_CONTRACT_ID, config } from '../constant';
import { DCLSwapGetStorageBalance } from '../ref';
import {
  nearDepositTransaction,
  ftGetStorageBalance,
  refDCLSwapViewFunction,
} from '../ref';

interface SwapInfo {
  tokenA: TokenMetadata;
  tokenB: TokenMetadata;
  amountA: string;
  amountB: string;
}

interface DCLSwapProps {
  swapInfo: SwapInfo;
  Swap?: {
    pool_ids: string[];
    min_output_amount: string;
  };
  SwapByOutput?: {
    pool_ids: string[];
    output_amount: string;
  };
  LimitOrderWithSwap?: {
    pool_id: string;
  };
  AccountId: string;
}
export const DCL_POOL_SPLITER = '|';

export const DCLSwap = async ({
  Swap,
  SwapByOutput,
  LimitOrderWithSwap,
  AccountId,
  swapInfo,
}: DCLSwapProps) => {
  const transactions: Transaction[] = [];

  const { tokenA, tokenB, amountA, amountB } = swapInfo;

  if (Swap) {
    const pool_ids = Swap.pool_ids;

    const tokenRegistered = await ftGetStorageBalance(
      tokenB.id,
      AccountId
    ).catch(() => {
      throw new Error(`${tokenB.id} doesn't exist.`);
    });

    if (tokenRegistered === null) {
      transactions.push({
        receiverId: tokenB.id,
        functionCalls: [registerAccountOnToken(AccountId)],
      });
    }

    const output_token = tokenB.id;
    const min_output_amount = toPrecision(Swap.min_output_amount, 0);

    const msg = JSON.stringify({
      Swap: {
        pool_ids,
        output_token,
        min_output_amount,
      },
    });

    transactions.push({
      receiverId: tokenA.id,
      functionCalls: [
        {
          methodName: 'ft_transfer_call',
          args: {
            receiver_id: config.REF_DCL_SWAP_CONTRACT_ID,
            amount: toNonDivisibleNumber(tokenA.decimals, amountA),
            msg,
          },
          gas: '180000000000000',
          amount: ONE_YOCTO_NEAR,
        },
      ],
    });
  }

  if (SwapByOutput) {
    const pool_ids = SwapByOutput.pool_ids;
    const output_token = tokenB.id;
    const output_amount = toNonDivisibleNumber(tokenB.decimals, amountB);
    const msg = JSON.stringify({
      SwapByOutput: {
        pool_ids,
        output_token,
        output_amount,
      },
    });
    const tokenRegistered = await ftGetStorageBalance(
      tokenB.id,
      AccountId
    ).catch(() => {
      throw new Error(`${tokenB.id} doesn't exist.`);
    });

    if (tokenRegistered === null) {
      transactions.push({
        receiverId: tokenB.id,
        functionCalls: [registerAccountOnToken(AccountId)],
      });
    }

    transactions.push({
      receiverId: tokenA.id,
      functionCalls: [
        {
          methodName: 'ft_transfer_call',
          args: {
            receiver_id: config.REF_DCL_SWAP_CONTRACT_ID,
            amount: toNonDivisibleNumber(tokenA.decimals, amountA),
            msg,
          },
          gas: '180000000000000',
          amount: ONE_YOCTO_NEAR,
        },
      ],
    });
  }

  if (LimitOrderWithSwap) {
    const pool_id = LimitOrderWithSwap.pool_id;

    const fee = Number(pool_id.split(DCL_POOL_SPLITER)[2]);

    const buy_token = tokenB.id;
    const point = priceToPoint({
      amountA,
      amountB,
      tokenA,
      tokenB,
      fee,
    });

    const tokenRegistered = await ftGetStorageBalance(
      tokenB.id,
      AccountId
    ).catch(() => {
      throw new Error(`${tokenB.id} doesn't exist.`);
    });

    if (tokenRegistered === null) {
      transactions.push({
        receiverId: tokenB.id,
        functionCalls: [registerAccountOnToken(AccountId)],
      });
    }

    const DCLRegistered = await DCLSwapGetStorageBalance(
      tokenB.id,
      AccountId
    ).catch(() => {
      throw new Error(`${tokenB.id} doesn't exist.`);
    });

    if (DCLRegistered === null) {
      transactions.push({
        receiverId: config.REF_DCL_SWAP_CONTRACT_ID,
        functionCalls: [
          {
            methodName: 'storage_deposit',
            args: {
              registration_only: true,
              account_id: AccountId,
            },
            gas: '30000000000000',
            amount: '0.5',
          },
        ],
      });
    }

    const new_point =
      pool_id.split(DCL_POOL_SPLITER)[0] === tokenA.id ? point : -point;

    const msg = JSON.stringify({
      LimitOrderWithSwap: {
        pool_id,
        buy_token,
        point: new_point,
      },
    });

    transactions.push({
      receiverId: tokenA.id,
      functionCalls: [
        {
          methodName: 'ft_transfer_call',
          args: {
            receiver_id: config.REF_DCL_SWAP_CONTRACT_ID,
            amount: toNonDivisibleNumber(tokenA.decimals, amountA),
            msg,
          },
          gas: '180000000000000',
          amount: ONE_YOCTO_NEAR,
        },
      ],
    });
  }

  if (tokenA.id === WRAP_NEAR_CONTRACT_ID) {
    transactions.unshift(nearDepositTransaction(amountA));
  }

  if (tokenA.id === WRAP_NEAR_CONTRACT_ID) {
    const registered = await ftGetStorageBalance(
      WRAP_NEAR_CONTRACT_ID,
      AccountId
    );
    if (registered === null) {
      transactions.unshift({
        receiverId: WRAP_NEAR_CONTRACT_ID,
        functionCalls: [registerAccountOnToken(AccountId)],
      });
    }
  }

  return transactions;
};

export const quote = async ({
  pool_ids,
  input_amount,
  input_token,
  output_token,
  tag,
}: {
  pool_ids: string[];
  input_token: TokenMetadata;
  output_token: TokenMetadata;
  input_amount: string;
  tag?: string;
}) => {
  return refDCLSwapViewFunction({
    methodName: 'quote',
    args: {
      pool_ids,
      input_token: input_token.id,
      output_token: output_token.id,
      input_amount: toNonDivisibleNumber(input_token.decimals, input_amount),
      tag,
    },
  }).catch(e => {
    return {
      amount: '0',
      tag: null,
    };
  });
};

export const list_user_assets = async (AccountId: string) => {
  if (!AccountId) return;

  return refDCLSwapViewFunction({
    methodName: 'list_user_assets',
    args: {
      account_id: AccountId,
    },
  });
};
