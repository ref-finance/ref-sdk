import { EstimateSwapView } from '../types';
import { Transaction } from '../types';
import { TokenMetadata } from '../../dist/types';
import { Theme } from './constant';

export type SwapState = 'success' | 'fail' | 'waitingForConfirmation' | null;
export interface SwapWidgetProps {
  theme?: Theme;
  defaultTokenList?: TokenMetadata[];
  onSwap: (transactionsRef: Transaction[]) => Promise<void>;
  onDisConnect: () => void;
  width: string;
  height?: string;
  enableSmartRouting?: boolean;
  className?: string;
  darkMode?: boolean;
  connection: {
    AccountId: string;
    isSignedIn: boolean;
  };

  defaultTokenIn?: string;
  defaultTokenOut?: string;
  referralId?: string;
  transactionState: {
    state: SwapState;
    setState: (state: SwapState) => void;
    tx?: string;
    detail?: string;
  };
  minNearAmountLeftForGasFees?: number; 
  onConnect: () => void;
}

export interface SwapOutParams {
  amountOut: string;
  minAmountOut: string;
  tokenInBalance: string;
  tokenOutBalance: string;
  balances: Record<string, string>;
  rate: string;
  fee: number;
  estimates: EstimateSwapView[];
  makeSwap: () => void;
  canSwap: boolean;
  swapError: Error | null;
  setAmountOut: (amount: string) => void;
  isEstimating: boolean;
}
