import { fetchAllRefPools } from './pool';
export const callSwap = async () => {
  const { simplePools, stablePools, ratedPools } = await fetchAllRefPools();

  return simplePools;
};
