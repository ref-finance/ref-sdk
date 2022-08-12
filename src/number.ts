export const ONLY_ZEROS = /^0*\.?0*$/;

export const toReadableNumber = (
  decimals: number,
  number: string = '0'
): string => {
  if (!decimals) return number;

  const wholeStr = number.substring(0, number.length - decimals) || '0';
  const fractionStr = number
    .substring(number.length - decimals)
    .padStart(decimals, '0')
    .substring(0, decimals);

  return `${wholeStr}.${fractionStr}`.replace(/\.?0+$/, '');
};

export const toNonDivisibleNumber = (
  decimals: number,
  number: string
): string => {
  if (decimals === null || decimals === undefined) return number;
  const [wholePart, fracPart = ''] = number.split('.');

  return `${wholePart}${fracPart.padEnd(decimals, '0').slice(0, decimals)}`
    .replace(/^0+/, '')
    .padStart(1, '0');
};

export function scientificNotationToString(strParam: string) {
  let flag = /e/.test(strParam);
  if (!flag || !strParam) return strParam;

  let sysbol = true;
  if (/e-/.test(strParam)) {
    sysbol = false;
  }

  const negative = Number(strParam) < 0 ? '-' : '';

  let index = Number(strParam.match(/\d+$/)?.[0]);

  let basis = strParam.match(/[\d\.]+/)?.[0];

  if (!index || !basis) return strParam;

  const ifFraction = basis.includes('.');

  let wholeStr;
  let fractionStr;

  if (ifFraction) {
    wholeStr = basis.split('.')[0];
    fractionStr = basis.split('.')[1];
  } else {
    wholeStr = basis;
    fractionStr = '';
  }

  if (sysbol) {
    if (!ifFraction) {
      return negative + wholeStr.padEnd(index + wholeStr.length, '0');
    } else {
      if (fractionStr.length <= index) {
        return negative + wholeStr + fractionStr.padEnd(index, '0');
      } else {
        return (
          negative +
          wholeStr +
          fractionStr.substring(0, index) +
          '.' +
          fractionStr.substring(index)
        );
      }
    }
  } else {
    if (!ifFraction)
      return (
        negative +
        wholeStr.padStart(index + wholeStr.length, '0').replace(/^0/, '0.')
      );
    else {
      return (
        negative +
        wholeStr.padStart(index + wholeStr.length, '0').replace(/^0/, '0.') +
        fractionStr
      );
    }
  }
}
