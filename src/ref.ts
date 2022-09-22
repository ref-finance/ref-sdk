import { REF_FI_CONTRACT_ID, config } from './constant';
import { keyStores, Near, WalletConnection } from 'near-api-js';
import { TokenNotExistError } from './error';

import {
  TokenMetadata,
  FTStorageBalance,
  RefFiViewFunctionOptions,
} from './types';

export const keyStore = new keyStores.BrowserLocalStorageKeyStore();

export const near = new Near({
  keyStore,
  headers: {},
  ...config,
});

export const wallet = new WalletConnection(near, REF_FI_CONTRACT_ID);

export const refFiViewFunction = ({
  methodName,
  args,
}: RefFiViewFunctionOptions) => {
  return wallet.account().viewFunction(REF_FI_CONTRACT_ID, methodName, args);
};

export const ftViewFunction = (
  tokenId: string,
  { methodName, args }: RefFiViewFunctionOptions
) => {
  return wallet.account().viewFunction(tokenId, methodName, args);
};

export const ftGetStorageBalance = (
  tokenId: string,
  accountId: string = wallet.getAccountId()
): Promise<FTStorageBalance | null> => {
  return ftViewFunction(tokenId, {
    methodName: 'storage_balance_of',
    args: { account_id: accountId },
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

// export const executeMultipleTransactions = async (
//   transactions: Transaction[],
//   callbackUrl?: string
// ) => {
//   const currentTransactions = await Promise.all(
//     transactions.map((t, i) => {
//       return wallet.createTransaction({
//         receiverId: t.receiverId,
//         nonceOffset: i + 1,
//         actions: t.functionCalls.map(fc =>
//           functionCall(
//             fc.methodName,
//             fc.args as object,
//             getGas(fc.gas || ''),
//             getAmount(fc.amount || '')
//           )
//         ),
//       });
//     })
//   );

//   return wallet.requestSignTransactions(currentTransactions, callbackUrl);
// };
