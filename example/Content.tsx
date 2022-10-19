import * as React from 'react';
import { SwapWidget } from '../dist/index';
import { useWalletSelector } from './WalletSelectorContext';
import '@near-wallet-selector/modal-ui/styles.css';
import { Transaction } from '../dist/index';
import {
  transformTransactions,
  WalletSelectorTransactions,
} from '../dist/index';
import { NotLoginError } from '../dist/index';

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
