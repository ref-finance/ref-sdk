import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { WalletSelectorContextProvider } from './WalletSelectorContext';
import { SwapWidgetProps } from '../src/SwapWidget/types';
import SwapWidget from '../src/SwapWidget';
import { Content } from './Content';
const App = () => {
  return (
    <WalletSelectorContextProvider>
      <Content />
    </WalletSelectorContextProvider>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
