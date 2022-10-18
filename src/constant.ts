import { TokenMetadata } from './types';
import { Theme } from './SwapWidget/types';
export const FEE_DIVISOR = 10000;

export const STABLE_LP_TOKEN_DECIMALS = 18;
export const RATED_POOL_LP_TOKEN_DECIMALS = 24;

export function getConfig(env: string | undefined = process.env.NEAR_ENV) {
  switch (env) {
    case 'mainnet':
      return {
        networkId: 'mainnet',
        nodeUrl: 'https://rpc.mainnet.near.org',
        walletUrl: 'https://wallet.near.org',
        WRAP_NEAR_CONTRACT_ID: 'wrap.near',
        REF_FI_CONTRACT_ID: 'v2.ref-finance.near',
        REF_TOKEN_ID: 'token.v2.ref-finance.near',
        indexerUrl: 'https://indexer.ref.finance',
        explorerUrl: 'https://testnet.nearblocks.io',
      };
    case 'testnet':
      return {
        networkId: 'testnet',
        nodeUrl: 'https://rpc.testnet.near.org',
        walletUrl: 'https://wallet.testnet.near.org',
        indexerUrl: 'https://testnet-indexer.ref-finance.com',
        WRAP_NEAR_CONTRACT_ID: 'wrap.testnet',
        REF_FI_CONTRACT_ID: 'ref-finance-101.testnet',
        REF_TOKEN_ID: 'ref.fakes.testnet',
        explorerUrl: 'https://testnet.nearblocks.io',
      };
    default:
      return {
        networkId: 'mainnet',
        nodeUrl: 'https://rpc.mainnet.near.org',
        walletUrl: 'https://wallet.near.org',
        REF_FI_CONTRACT_ID: 'v2.ref-finance.near',
        WRAP_NEAR_CONTRACT_ID: 'wrap.near',
        REF_TOKEN_ID: 'token.v2.ref-finance.near',
        indexerUrl: 'https://indexer.ref.finance',
        explorerUrl: 'https://testnet.nearblocks.io',
      };
  }
}

export const config = getConfig();

export const REF_FI_CONTRACT_ID = config.REF_FI_CONTRACT_ID;

export const WRAP_NEAR_CONTRACT_ID = config.WRAP_NEAR_CONTRACT_ID;

export const REF_TOKEN_ID = config.REF_TOKEN_ID;

export const STORAGE_TO_REGISTER_WITH_MFT = '0.1';

export const ONE_YOCTO_NEAR = '0.000000000000000000000001';

export const WNEAR_META_DATA: TokenMetadata = {
  id: WRAP_NEAR_CONTRACT_ID,
  name: 'wNEAR',
  symbol: 'wNEAR',
  decimals: 24,
  icon: 'https://assets.ref.finance/images/w-NEAR-no-border.png',
};

export const REF_META_DATA = {
  decimals: 18,
  icon:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='16 24 248 248' style='background: %23000'%3E%3Cpath d='M164,164v52h52Zm-45-45,20.4,20.4,20.6-20.6V81H119Zm0,18.39V216h41V137.19l-20.6,20.6ZM166.5,81H164v33.81l26.16-26.17A40.29,40.29,0,0,0,166.5,81ZM72,153.19V216h43V133.4l-11.6-11.61Zm0-18.38,31.4-31.4L115,115V81H72ZM207,121.5h0a40.29,40.29,0,0,0-7.64-23.66L164,133.19V162h2.5A40.5,40.5,0,0,0,207,121.5Z' fill='%23fff'/%3E%3Cpath d='M189 72l27 27V72h-27z' fill='%2300c08b'/%3E%3C/svg%3E%0A",
  id: REF_TOKEN_ID,
  name: 'Ref Finance Token',
  symbol: 'REF',
};

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
};

export const TokenLinks = {
  NEAR: 'https://awesomenear.com/near-protocol',
  wNEAR: 'https://awesomenear.com/near-protocol',
  REF: 'https://awesomenear.com/ref-finance',
  OCT: 'https://awesomenear.com/octopus-network',
  PARAS: 'https://awesomenear.com/paras',
  SKYWARD: 'https://awesomenear.com/skyward-finance',
  FLX: 'https://awesomenear.com/flux',
  PULSE: 'https://awesomenear.com/pulse',
  DBIO: 'https://awesomenear.com/debio-network',
  MYRIA: 'https://awesomenear.com/myriad-social',
  PXT: 'https://awesomenear.com/cryptoheroes',
  HAPI: 'https://awesomenear.com/hapi',
  OIN: 'https://awesomenear.com/oin-finance',
  ABR: 'https://awesomenear.com/allbridge',
  '1MIL': 'https://awesomenear.com/1millionnfts',
  MARMAJ: 'https://awesomenear.com/marmaj-foundation',
  marmaj: 'https://awesomenear.com/marmaj-foundation',
  USN: 'https://awesomenear.com/decentral-bank',
  '1INCH': 'https://awesomenear.com/1inch-network',
  GRT: 'https://awesomenear.com/the-graph',
  LINK: 'https://awesomenear.com/chainlink',
  Cheddar: 'https://awesomenear.com/cheddar-farm',
  AURORA: 'https://awesomenear.com/aurora-dev',
  $META: 'https://awesomenear.com/meta-pool',
  UMINT: 'https://awesomenear.com/youminter',
  UTO: 'https://awesomenear.com/secret-skellies-society',
  DEIP: 'https://awesomenear.com/deip',
  WOO: 'https://awesomenear.com/woo-dex',
  LINEAR: 'https://awesomenear.com/linear-protocol',
  PEM: 'https://awesomenear.com/pembrock-finance',
  ATO: 'https://awesomenear.com/atocha-protocol',
  SEAT: 'https://awesomenear.com/seatlab-nft',
  FAR: 'https://awesomenear.com/few-and-far',
  BSTN: 'https://awesomenear.com/bastion',
  BRRR: 'https://awesomenear.com/burrow',
  XNL: 'https://awesomenear.com/chronicle',
  KSW: 'https://awesomenear.com/killswitch-finance',
  STNEAR: 'https://awesomenear.com/meta-pool',
  NearX: 'https://awesomenear.com/stader',
  SD: 'https://awesomenear.com/stader',
  DISC: 'https://awesomenear.com/discovol',
} as Record<string, string>;
