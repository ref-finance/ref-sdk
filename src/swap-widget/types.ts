import { EstimateSwapView } from '../types';
import { Transaction } from '../types';
import { TokenMetadata } from '../../dist/types';
import { Theme } from './constant';

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
  transactionState?: {
    state: 'success' | 'fail' | null;
    setState: (state: 'success' | 'fail' | null) => void;
    tx?: string;
    detail?: string;
  };

  onConnect: () => void;
}

export interface SwapOutParams {
  amountOut: string;
  minAmountOut: string;
  rate: string;
  fee: number;
  estimates: EstimateSwapView[];
  makeSwap: () => void;
  canSwap: boolean;
  swapError: Error | null;
  setAmountOut: (amount: string) => void;
  isEstimating: boolean;
  isSwapping: boolean;
}
