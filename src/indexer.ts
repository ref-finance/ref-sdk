import { config } from './constant';
import { REF_WIDGET_ALL_TOKENS_LIST_KEY } from './SwapWidget/constant';

export const getTokenPriceList = async (): Promise<any> => {
  return await fetch(config.indexerUrl + '/list-token-price', {
    method: 'GET',
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
  })
    .then(res => res.json())
    .then(list => {
      return list;
    });
};

export const getTokens = async (reload?: boolean) => {
  const storagedTokens =
    typeof window !== 'undefined' && !reload
      ? localStorage.getItem(REF_WIDGET_ALL_TOKENS_LIST_KEY)
      : null;

  return storagedTokens
    ? JSON.parse(storagedTokens)
    : await fetch(config.indexerUrl + '/list-token', {
        method: 'GET',
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
      })
        .then(res => res.json())
        .then(tokens => {
          const newTokens = Object.values(tokens).reduce(
            (acc: any, cur: any, i) => {
              return {
                ...acc,
                [Object.keys(tokens)[i]]: {
                  ...cur,
                  id: Object.keys(tokens)[i],
                },
              };
            },
            {}
          );

          return newTokens;
        })
        .then(res => {
          localStorage.setItem(
            REF_WIDGET_ALL_TOKENS_LIST_KEY,
            JSON.stringify(res)
          );
          return res;
        });
};

export const getWhiteListTokensIndexer = async (whiteListIds: string[]) => {
  return await fetch(config.indexerUrl + '/list-token', {
    method: 'GET',
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
  })
    .then(res => res.json())
    .then(res => {
      return whiteListIds.reduce((acc, cur, i) => {
        return {
          ...acc,
          [cur]: { ...res[cur], id: cur },
        };
      }, {});
    })
    .then(res => {
      return Object.values(res);
    });
};
