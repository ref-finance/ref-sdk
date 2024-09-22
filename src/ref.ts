import {
  REF_FI_CONTRACT_ID,
  config,
  WRAP_NEAR_CONTRACT_ID,
  NEAR_META_DATA,
  getConfig,
  switchEnv,
  FT_MINIMUM_STORAGE_BALANCE_LARGE,
} from './constant';
import {
  keyStores,
  Near,
  providers,
  WalletConnection,
  utils,
} from 'near-api-js';
import { NoAccountIdFound, TokenNotExistError, DCLInValid } from './error';
import { getKeyStore } from './near';

import {
  TokenMetadata,
  FTStorageBalance,
  RefFiViewFunctionOptions,
} from './types';
import { AccountView, CodeResult } from 'near-api-js/lib/providers/provider';
import { Transaction } from './types';
import { ONE_YOCTO_NEAR, REF_TOKEN_ID, REF_META_DATA } from './constant';

import metaIconDefaults from './metaIcons';

const BANANA_ID = 'berryclub.ek.near';
const CHEDDAR_ID = 'token.cheddar.near';
const CUCUMBER_ID = 'farm.berryclub.ek.near';
const HAPI_ID = 'd9c2d319cd7e6177336b0a9c93c21cb48d84fb54.factory.bridge.near';
const WOO_ID = '4691937a7508860f876c9c0a2a617e7d9e945d4b.factory.bridge.near';

export const REPLACE_TOKENS = [
  BANANA_ID,
  CHEDDAR_ID,
  CUCUMBER_ID,
  HAPI_ID,
  WOO_ID,
];

let near = new Near({
  keyStore: getKeyStore(),
  headers: {},
  ...getConfig(),
});
export const init_env = (env: string, indexerUrl?: string, nodeUrl?: string) => {
  near = new Near({
    keyStore: getKeyStore(),
    headers: {},
    ...getConfig(env, indexerUrl, nodeUrl),
  });
  return switchEnv();
};

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
    throw TokenNotExistError(id);
  });

  if (
    !metadata.icon ||
    id === BANANA_ID ||
    id === CHEDDAR_ID ||
    id === CUCUMBER_ID ||
    id === HAPI_ID ||
    id === WOO_ID ||
    id === WRAP_NEAR_CONTRACT_ID
  ) {
    return {
      ...metadata,
      icon: metaIconDefaults[id],
      id,
    };
  }

  return { ...metadata, id };
};

export const ftGetTokensMetadata = async (
  tokenIds?: string[],
  allTokens?: Record<string, TokenMetadata>
) => {
  const ids = tokenIds || (await getGlobalWhitelist());

  const tokensMetadata = await Promise.all(
    ids.map(
      (id: string) =>
        allTokens?.[id] || ftGetTokenMetadata(id).catch(() => null)
    )
  );

  return tokensMetadata.reduce((pre, cur, i) => {
    return {
      ...pre,
      [ids[i]]: cur,
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

export const refDCLSwapViewFunction = async ({
  methodName,
  args,
}: RefFiViewFunctionOptions) => {
  const nearConnection = await near.account(REF_FI_CONTRACT_ID);

  if (!config.REF_DCL_SWAP_CONTRACT_ID) throw DCLInValid;

  return nearConnection.viewFunction(
    config.REF_DCL_SWAP_CONTRACT_ID,
    methodName,
    args
  );
};

export const DCLSwapGetStorageBalance = (
  tokenId: string,
  AccountId: string
) => {
  return refDCLSwapViewFunction({
    methodName: 'storage_balance_of',
    args: { account_id: AccountId },
  });
};

export const getMinStorageBalance = async (
  nep141Address: string
): Promise<string> => {
  try {
    const provider = new providers.JsonRpcProvider({
      url: getConfig().nodeUrl,
    });
    const result = await provider.query<CodeResult>({
      request_type: 'call_function',
      account_id: nep141Address,
      method_name: 'storage_balance_bounds',
      args_base64: '',
      finality: 'optimistic',
    });
    const balance = JSON.parse(Buffer.from(result.result).toString());
    if (!balance || !balance.min) return FT_MINIMUM_STORAGE_BALANCE_LARGE;
    return balance.min as string;
  } catch (e) {
    console.error(e, nep141Address);
    return FT_MINIMUM_STORAGE_BALANCE_LARGE;
  }
};
