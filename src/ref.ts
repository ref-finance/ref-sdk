import { REF_FI_CONTRACT_ID, config } from './constant';
import { keyStores, Near, WalletConnection } from 'near-api-js';
import { NoAccountIdFound, TokenNotExistError } from './error';
import { getKeyStore } from './near';

import {
  TokenMetadata,
  FTStorageBalance,
  RefFiViewFunctionOptions,
} from './types';

// export const keyStore = new keyStores.BrowserLocalStorageKeyStore();

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
  if (!!AccountId) '0';

  return ftViewFunction(tokenId, {
    methodName: 'ft_balance_of',
    args: {
      account_id: AccountId,
    },
  }).catch(() => '0');
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
