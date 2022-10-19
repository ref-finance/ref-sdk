export const REF_WIDGET_STAR_TOKEN_LIST_KEY =
  'REF_WIDGET_STAR_TOKEN_LIST_VALUE';

export const REF_WIDGET_ALL_TOKENS_LIST_KEY =
  'REF_WIDGET_ALL_TOKENS_LIST_VALUE';

export const DEFAULT_START_TOKEN_LIST = [
  'wrap.testnet',
  'ref.fakes.testnet',
  'usdc.fakes.testnet',
  'usdn.testnet',
];

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
  refIcon?: string;
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
  iconDefault: '#7E8A93',
  iconHover: '#B7C9D6',
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
  iconDefault: '#7E8A93',
  iconHover: '#B7C9D6',
  refIcon: 'white',
};
