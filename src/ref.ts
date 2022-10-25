import {
  REF_FI_CONTRACT_ID,
  config,
  WRAP_NEAR_CONTRACT_ID,
  NEAR_META_DATA,
  getConfig,
} from './constant';
import {
  keyStores,
  Near,
  providers,
  WalletConnection,
  utils,
} from 'near-api-js';
import { NoAccountIdFound, TokenNotExistError } from './error';
import { getKeyStore } from './near';

import {
  TokenMetadata,
  FTStorageBalance,
  RefFiViewFunctionOptions,
} from './types';
import { AccountView } from 'near-api-js/lib/providers/provider';
import { Transaction } from './types';
import { ONE_YOCTO_NEAR, REF_TOKEN_ID, REF_META_DATA } from './constant';

export const near = new Near({
  keyStore: getKeyStore(),
  headers: {},
  ...config,
});

export const refFiViewFunction = async ({
  methodName,
  args,
}: RefFiViewFunctionOptions) => {
  const nearConnection = await near.account(REF_FI_CONTRACT_ID);

  return nearConnection.viewFunction(REF_FI_CONTRACT_ID, methodName, args);
};

export const ftViewFunction = async (
  tokenId: string,
  { methodName, args }: RefFiViewFunctionOptions
) => {
  const nearConnection = await near.account(REF_FI_CONTRACT_ID);

  return nearConnection.viewFunction(tokenId, methodName, args);
};

export const ftGetStorageBalance = (
  tokenId: string,
  AccountId: string
): Promise<FTStorageBalance | null> => {
  if (!AccountId) throw NoAccountIdFound;

  return ftViewFunction(tokenId, {
    methodName: 'storage_balance_of',
    args: { account_id: AccountId },
  });
};

export const ftGetBalance = async (tokenId: string, AccountId: string) => {
  if (!AccountId) return '0';

  if (tokenId === 'NEAR') {
    return getAccountNearBalance(AccountId).catch(() => '0');
  }

  return ftViewFunction(tokenId, {
    methodName: 'ft_balance_of',
    args: {
      account_id: AccountId,
    },
  })
    .then(res => {
      return res;
    })
    .catch(() => '0');
};

export const getTotalPools = async () => {
  return refFiViewFunction({
    methodName: 'get_number_of_pools',
  });
};

export const ftGetTokenMetadata = async (
  id: string,
  tag?: string
): Promise<TokenMetadata> => {
  if (id === REF_TOKEN_ID) return REF_META_DATA;

  const metadata = await ftViewFunction(id, {
    methodName: 'ft_metadata',
  }).catch(() => {
    throw TokenNotExistError;
  });

  return { ...metadata, id };
};

export const ftGetTokensMetadata = async (
  tokenIds: string[],
  allTokens: Record<string, TokenMetadata>
) => {
  const tokensMetadata = await Promise.all(
    tokenIds.map((id: string) => allTokens[id] || ftGetTokenMetadata(id))
  );

  return tokensMetadata.reduce((pre, cur, i) => {
    return {
      ...pre,
      [tokenIds[i]]: cur,
    };
  }, {}) as Record<string, TokenMetadata>;
};

export const getGlobalWhitelist = async (): Promise<string[]> => {
  const globalWhitelist = await refFiViewFunction({
    methodName: 'get_whitelisted_tokens',
  });
  return Array.from(new Set(globalWhitelist));
};

export const getUserRegisteredTokens = async (
  AccountId?: string
): Promise<string[]> => {
  if (!AccountId) return [];

  return refFiViewFunction({
    methodName: 'get_user_whitelisted_tokens',
    args: { account_id: AccountId },
  });
};

export const getAccountNearBalance = async (accountId: string) => {
  const provider = new providers.JsonRpcProvider({
    url: getConfig().nodeUrl,
  });

  return provider
    .query<AccountView>({
      request_type: 'view_account',
      finality: 'final',
      account_id: accountId,
    })
    .then(data => data.amount);
};

export const nearDepositTransaction = (amount: string) => {
  const transaction: Transaction = {
    receiverId: WRAP_NEAR_CONTRACT_ID,
    functionCalls: [
      {
        methodName: 'near_deposit',
        args: {},
        gas: '50000000000000',
        amount,
      },
    ],
  };

  return transaction;
};

export const nearWithdrawTransaction = (amount: string) => {
  const transaction: Transaction = {
    receiverId: WRAP_NEAR_CONTRACT_ID,
    functionCalls: [
      {
        methodName: 'near_withdraw',
        args: { amount: utils.format.parseNearAmount(amount) },
        amount: ONE_YOCTO_NEAR,
      },
    ],
  };
  return transaction;
};
