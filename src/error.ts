import { config, getConfig } from './constant';

export const formatError = (msg: string) => {
  return new Error(msg);
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

export const NoPuiblicKeyError = formatError('No public key found');

export const NoLocalSignerError = formatError('No local signer found');

export const InValidAccessKeyError = formatError('Invalid access key');

export const AccountIdMisMatch = formatError(
  "Your input account id doesn't match the account id in the credential"
);

export const NoCredential = formatError('No Credential to such path');

export const NoAccountIdFound = formatError('No account id found');

export const NoFeeToPool = (fee: number) =>
  formatError(`InValid fee ${fee} to DCL pool`);

export const DCLInValid = formatError(
  `DCL contract currently in Valid on ${config.networkId}`
);
