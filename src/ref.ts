import { REF_FI_CONTRACT_ID, config } from './constant';
import { keyStores, Near, WalletConnection } from 'near-api-js';
import { TokenNotExistError } from './error';
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
  AccountId: string = ''
): Promise<FTStorageBalance | null> => {
  return ftViewFunction(tokenId, {
    methodName: 'storage_balance_of',
    args: { account_id: AccountId },
  });
};

export const getTotalPools = async () => {
  return refFiViewFunction({
    methodName: 'get_number_of_pools',
  });
};

export const ftGetTokenMetadata = async (
  id: string
): Promise<TokenMetadata> => {
  const metadata = await ftViewFunction(id, {
    methodName: 'ft_metadata',
  }).catch(() => {
    throw TokenNotExistError;
  });

  return { ...metadata, id };
};

export const ftGetTokensMetadata = async (tokenIds: string[]) => {
  const tokensMetadata = await Promise.all(
    tokenIds.map((id: string) => ftGetTokenMetadata(id))
  );

  return tokensMetadata.reduce((pre, cur, i) => {
    return {
      ...pre,
      [tokenIds[i]]: cur,
    };
  }, {}) as Record<string, TokenMetadata>;
};
