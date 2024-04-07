import { getConfig } from '../constant';
export const REF_WIDGET_STAR_TOKEN_LIST_KEY =
  'REF_WIDGET_STAR_TOKEN_LIST_VALUE';

export const REF_WIDGET_ALL_TOKENS_LIST_KEY =
  'REF_WIDGET_ALL_TOKENS_LIST_VALUE';
export const REF_WIDGET_ALL_LIGHT_TOKENS_LIST_KEY =
  'REF_WIDGET_ALL_LIGHT_TOKENS_LIST_VALUE';

export const REF_WIDGET_SWAP_IN_KEY = 'REF_WIDGET_SWAP_IN_VALUE';

export const REF_WIDGET_SWAP_OUT_KEY = 'REF_WIDGET_SWAP_OUT_VALUE';

export const REF_WIDGET_SWAP_DETAIL_KEY = 'REF_WIDGET_SWAP_DETAIL_VALUE';

export const DEFAULT_START_TOKEN_LIST_TESTNET = [
  'wrap.testnet',
  'usdtt.fakes.testnet',
  'usdt.fakes.testnet',
  'ref.fakes.testnet',
  'usdn.testnet',
  'eth.fakes.testnet',
];

export const DEFAULT_START_TOKEN_LIST_MAINNET = [
  'wrap.near',
  'usdt.tether-token.near',
  'dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near',
  'token.v2.ref-finance.near',
  'usn',
  'aurora',
  'token.sweat',
];

export interface Theme {
  container: string; // container background
  buttonBg: string; // button background
  primary: string; // primary theme color
  secondary: string; // secondary theme color
  borderRadius: string; // border radius
  fontFamily: string; // font family
  hover: string; // hovering color
  active: string; // active color
  secondaryBg: string; // secondary background color
  borderColor: string; // border color
  iconDefault: string; // default icon color
  iconHover: string; // icon hovering color
  refIcon?: string; // ref icon color
}

export const defaultTheme: Theme = {
  container: '#FFFFFF',
  buttonBg: '#00C6A2',
  primary: '#000000',
  secondary: '#7E8A93',
  borderRadius: '4px',
  fontFamily: 'sans-serif',
  hover: 'rgba(126, 138, 147, 0.2)',
  active: 'rgba(126, 138, 147, 0.2)',
  secondaryBg: '#F7F7F7',
  borderColor: 'rgba(126, 138, 147, 0.2)',
  iconDefault: 'rgba(126, 138, 147, 1)',
  iconHover: 'rgba(62, 62, 62, 1)',
};

export const defaultDarkModeTheme: Theme = {
  container: '#26343E',
  buttonBg: '#00C6A2',
  primary: '#FFFFFF',
  secondary: '#7E8A93',
  borderRadius: '4px',
  fontFamily: 'sans-serif',
  hover: 'rgba(126, 138, 147, 0.2)',
  active: 'rgba(126, 138, 147, 0.2)',
  secondaryBg: 'rgba(0, 0, 0, 0.2)',
  borderColor: 'rgba(126, 138, 147, 0.2)',
  iconDefault: 'rgba(126, 138, 147, 1)',
  iconHover: 'rgba(183, 201, 214, 1)',
  refIcon: 'white',
};
