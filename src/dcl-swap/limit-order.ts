import { TokenMetadata, Transaction } from '../types';
import { NoOrderFound, OrderNoRemainedAmount } from '../error';
import {
  priceToPoint,
  toNonDivisibleNumber,
  toPrecision,
  registerAccountOnToken,
} from '../utils';
import {
  ONE_YOCTO_NEAR,
  WRAP_NEAR_CONTRACT_ID,
  config,
  POINTLEFTRANGE,
  POINTRIGHTRANGE,
} from '../constant';
import {
  nearDepositTransaction,
  ftGetStorageBalance,
  refDCLSwapViewFunction,
} from '../ref';

export interface UserOrderInfo {
  order_id: string;
  owner_id: string;
  pool_id: string;
  point: number;
  sell_token: string;
  created_at: string;
  original_amount: string;
  remain_amount: string; // 0 means history order: ;
  cancel_amount: string;
  // amount through ft_transfer_call

  original_deposit_amount: string;
  // earn token amount through swap before actual place order

  swap_earn_amount: string;
  buy_token: string;
  unclaimed_amount: string; // claim will push it to inner account
  bought_amount: string; // accumalated amount into inner account
}

export const list_history_orders = (AccountId: string) => {
  return refDCLSwapViewFunction({
    methodName: 'list_history_orders',
    args: {
      account_id: AccountId,
    },
  });
};

export const list_active_orders = (AccountId: string) => {
  return refDCLSwapViewFunction({
    methodName: 'list_active_orders',
    args: {
      account_id: AccountId,
    },
  });
};

export const get_order = async (order_id: string) => {
  return refDCLSwapViewFunction({
    methodName: 'get_order',
    args: {
      order_id,
    },
  }).catch(() => {
    throw NoOrderFound(order_id);
  });
};

export const find_order = async ({
  pool_id,
  point,
  AccountId,
}: {
  pool_id: string;
  point: number;
  AccountId: string;
}) => {
  return refDCLSwapViewFunction({
    methodName: 'find_order',
    args: {
      account_id: AccountId,
      pool_id,
      point,
    },
  }).catch(() => {
    throw NoOrderFound();
  }) as Promise<UserOrderInfo>;
};
export const cancel_order = async (order_id: string) => {
  const order = await get_order(order_id);

  if (!order.remain_amount) throw OrderNoRemainedAmount;

  const transactions: Transaction[] = [
    {
      receiverId: config.REF_DCL_SWAP_CONTRACT_ID,
      functionCalls: [
        {
          methodName: 'cancel_order',
          args: {
            order_id,
            amount: order.remain_amount,
          },
          gas: '180000000000000',
        },
      ],
    },
  ];

  return transactions;
};

export const claim_order = (order_id: string) => {
  const transactions: Transaction[] = [
    {
      receiverId: config.REF_DCL_SWAP_CONTRACT_ID,
      functionCalls: [
        {
          methodName: 'cancel_order',
          args: {
            order_id,
            amount: '0',
          },
          gas: '180000000000000',
        },
      ],
    },
  ];

  return transactions;
};

export const get_pointorder_range = ({
  pool_id,
  left_point,
  right_point,
}: {
  pool_id: string;
  left_point?: number;
  right_point?: number;
}) => {
  return refDCLSwapViewFunction({
    methodName: 'get_pointorder_range',
    args: {
      pool_id,
      left_point: left_point || POINTLEFTRANGE,
      right_point: right_point || POINTRIGHTRANGE,
    },
  });
};
