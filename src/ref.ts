import { REF_FI_CONTRACT_ID, config } from './constant';
import { keyStores, Near, utils, WalletConnection } from 'near-api-js';

export const keyStore = new keyStores.BrowserLocalStorageKeyStore();

export const near = new Near({
  keyStore,
  headers: {},
  ...config,
});

export const wallet = new WalletConnection(near, REF_FI_CONTRACT_ID);

export interface RefFiViewFunctionOptions {
  methodName: string;
  args?: object;
}

export const refFiViewFunction = ({
  methodName,
  args,
}: RefFiViewFunctionOptions) => {
  return wallet.account().viewFunction(REF_FI_CONTRACT_ID, methodName, args);
};

export const getTotalPools = async () => {
  return refFiViewFunction({
    methodName: 'get_number_of_pools',
  });
};
