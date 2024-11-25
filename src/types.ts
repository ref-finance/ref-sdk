import Big from 'big.js';
import { PoolMode } from './v1-swap/swap';

export interface TokenMetadata {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  icon: string;
}

export type PoolKind =
  | 'SIMPLE_POOL'
  | 'STABLE_SWAP'
  | 'RATED_SWAP'
  | 'DEGEN_SWAP';

export type StablePoolKind = 'STABLE_SWAP' | 'RATED_SWAP' | 'DEGEN_SWAP';

export interface PoolRPCView {
  id: number;
  token_account_ids: string[];
  token_symbols: string[];
  amounts: string[];
  total_fee: number;
  shares_total_supply: string;
  tvl: number;
  token0_ref_price: string;
  share: string;
  decimalsHandled?: boolean;
  tokens_meta_data?: TokenMetadata[];
  pool_kind?: PoolKind;
}

export interface Pool {
  id: number;
  tokenIds: string[];
  supplies: { [key: string]: string };
  fee: number;
  total_fee?: number;
  shareSupply: string;
  tvl: number;
  token0_ref_price: string;
  partialAmountIn?: string;
  Dex?: string;
  pool_kind?: PoolKind;
  rates?: {
    [id: string]: string;
  };
}

export interface StablePool {
  id: number;
  token_account_ids: string[];
  decimals: number[];
  amounts: string[];
  c_amounts: string[];
  total_fee: number;
  shares_total_supply: string;
  amp: number;
  rates: string[];
  pool_kind: StablePoolKind;
  partialAmountIn?: string;
  degens?: string[];
}

export interface SmartRoutingInputPool {
  id: number;
  token1Id: string;
  token2Id: string;
  token1Supply: string;
  token2Supply: string;
  fee: number;
  shares: string;
  token0_price: string;
}

export interface RoutePool {
  amounts: string[];
  fee: number;
  id: number;
  shares: string;
  token0_ref_price: string;
  token1Id: string;
  token1Supply: string;
  token2Id: string;
  token2Supply: string;
  updateTime: number;
  partialAmountIn?: string | number | Big;
  gamma_bps?: Big;
  tokenIds?: string[];
  x?: string;
  y?: string;
}

export interface EstimateSwapView {
  estimate: string;
  pool: Pool;
  intl?: any;
  dy?: string;
  status?: PoolMode;
  noFeeAmountOut?: string;
  inputToken?: string;
  outputToken?: string;
  nodeRoute?: string[];
  tokens?: TokenMetadata[];
  routeInputToken?: string;
  route?: RoutePool[];
  allRoutes?: RoutePool[][];
  allNodeRoutes?: string[][];
  totalInputAmount?: string;
}

export interface RefFiViewFunctionOptions {
  methodName: string;
  args?: object;
}

export interface RefFiFunctionCallOptions extends RefFiViewFunctionOptions {
  gas?: string;
  amount?: string;
}

export interface Transaction {
  receiverId: string;
  functionCalls: RefFiFunctionCallOptions[];
}

export interface TransformedTransaction {
  signerId: string;
  receiverId: string;
  actions: {
    type: string;
    params: {
      methodName: string;
      args: object;
      gas: string;
      deposit: string;
    };
  }[];
}

export interface FTStorageBalance {
  total: string;
  available: string;
}
