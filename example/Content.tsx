import * as React from 'react';
import SwapWidget from '../src/SwapWidget';
import { useWalletSelector } from './WalletSelectorContext';
import { SignAndSendTransactionsParams } from '@near-wallet-selector/core/lib/wallet';
import '@near-wallet-selector/modal-ui/styles.css';
import { Transaction } from '../src/types';
import {
  transformTransactions,
  WalletSelectorTransactions,
} from '../src/utils';
import { NotLoginError } from '../src/error';

export const Content = () => {
  const { modal, selector, accountId } = useWalletSelector();

  const onDisConnect = async () => {
    const wallet = await selector.wallet();
    return await wallet.signOut();
  };

  const onConnect = () => {
    modal.show();
  };

  const [swapState, setSwapState] = React.useState<'success' | 'fail' | null>(
    'fail'
  );

  const onSwap = async (transactionsRef: Transaction[]) => {
    const wallet = await selector.wallet();

    if (!accountId) throw NotLoginError;

    wallet.signAndSendTransactions(
      WalletSelectorTransactions(transactionsRef, accountId)
    );
  };

  return (
    <SwapWidget
      onSwap={onSwap}
      onDisConnect={onDisConnect}
      width={'400px'}
      connection={{
        AccountId: accountId || '',
        isSignedIn: !!accountId,
      }}
      enableSmartRouting={true}
      onConnect={onConnect}
      defaultTokenIn={'wrap.testnet'}
      defaultTokenOut={'ref.fakes.testnet'}
    />
  );
};
