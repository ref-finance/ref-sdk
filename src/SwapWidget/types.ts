import { EstimateSwapView } from '../types';
import { Transaction } from '../types';
import { TokenMetadata } from '../../dist/types';
export interface Theme {
  container: string; // container bg
  buttonBg: string; // button bg
  primary: string; // primary color for text color
  secondary: string; // color for some details
  borderRadius: string; // custom border radius
  fontFamily: string; // font family
  hover: string; // interactive color, like hover, active, etc
  active: string;
  secondaryBg: string; // secondary bg color
  borderColor: string; // border color
  iconDefault: string; // default icon color
  iconHover: string; // icon color when hover
}

export interface SwapWidgetProps {
  theme?: Theme;
  extraTokenList?: string[];
  onSwap: (transactionsRef: Transaction[]) => void;
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
  transactionState?: {
    state: 'success' | 'fail' | null;
    tx?: string;
  };

  successSwap?: {
    tx?: string;
    onSwapSuccess: () => void;
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
}
