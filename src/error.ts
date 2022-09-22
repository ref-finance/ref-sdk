import { getConfig } from './constant';

export const formatError = (msg: string) => {
  throw new Error(msg);
};

export const unNamedError = formatError('Something wrong happened');

export const SameInputTokenError = formatError(
  'Input token should be different with output token'
);

export const ZeroInputError = formatError(
  'Input amount should be greater than 0'
);

export const NoPoolError = formatError('No pool found for the input tokens');

export const NotLoginError = formatError('Please login in first');

export const SwapRouteError = formatError(
  "Something wrong happened, we don't get correct routes corrreponding to current input"
);

export const TokenNotExistError = formatError(
  `This token doesn't exist in ${getConfig().networkId}`
);
