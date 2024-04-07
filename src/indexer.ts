import { config, WRAP_NEAR_CONTRACT_ID, NEAR_META_DATA } from './constant';
import {
  REF_WIDGET_ALL_TOKENS_LIST_KEY,
  REF_WIDGET_ALL_LIGHT_TOKENS_LIST_KEY,
} from './swap-widget/constant';
import { REPLACE_TOKENS } from './ref';
import metaIconDefaults from './metaIcons';

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
              const id = Object.keys(tokens)[i];
              return {
                ...acc,
                [id]: {
                  ...cur,
                  id,
                  icon:
                    !cur.icon || REPLACE_TOKENS.includes(id)
                      ? metaIconDefaults[id]
                      : cur.icon,
                },
              };
            },
            {}
          );

          return newTokens;
        })
        .then(res => {
          typeof window !== 'undefined' &&
            !reload &&
            localStorage.setItem(
              REF_WIDGET_ALL_TOKENS_LIST_KEY,
              JSON.stringify(res)
            );
          return res;
        });
};
export const getTokensTiny = async (reload?: boolean) => {
  const storagedTokens =
    typeof window !== 'undefined' && !reload
      ? localStorage.getItem(REF_WIDGET_ALL_LIGHT_TOKENS_LIST_KEY)
      : null;

  return storagedTokens
    ? JSON.parse(storagedTokens)
    : await fetch(config.indexerUrl + '/list-token-v2', {
        method: 'GET',
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
      })
        .then(res => res.json())
        .then(tokens => {
          const newTokens = Object.values(tokens).reduce(
            (acc: any, cur: any, i) => {
              const id = Object.keys(tokens)[i];
              return {
                ...acc,
                [id]: {
                  ...cur,
                  id,
                },
              };
            },
            {}
          );

          return newTokens;
        })
        .then(res => {
          typeof window !== 'undefined' &&
            !reload &&
            localStorage.setItem(
              REF_WIDGET_ALL_LIGHT_TOKENS_LIST_KEY,
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
        if (
          !res[cur] ||
          !Object.values(res[cur]) ||
          Object.values(res[cur]).length === 0
        )
          return acc;

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
