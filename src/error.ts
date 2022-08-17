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
