import { config } from './constant';

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

export const getTokens = async () => {
  return await fetch(config.indexerUrl + '/list-token', {
    method: 'GET',
    headers: { 'Content-type': 'application/json; charset=UTF-8' },
  })
    .then(res => res.json())
    .then(tokens => {
      const newTokens = Object.values(tokens).reduce(
        (acc: any, cur: any, i) => {
          return {
            ...acc,
            [Object.keys(tokens)[i]]: { ...cur, id: Object.keys(tokens)[i] },
          };
        },
        {}
      );

      return newTokens;
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
          cur: res[cur],
        };
      }, {});
    });
};
