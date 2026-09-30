/**
 * Arabic Number-to-Words Converter (تفقيط)
 * Converts numeric values to Arabic words for legal documents.
 * Supports Egyptian Arabic conventions.
 */

const ONES = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة',
  'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
  'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
];

const TENS = [
  '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون',
  'ستون', 'سبعون', 'ثمانون', 'تسعون'
];

const HUNDREDS = [
  '', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
  'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'
];

/**
 * Converts a number (0 - 999,999,999,999) to Arabic words.
 * @param {number} num - The number to convert
 * @returns {string} Arabic words representation
 */
export function numberToArabicWords(num) {
  if (num === undefined || num === null || isNaN(num)) return '';
  
  num = Math.floor(Math.abs(Number(num)));
  
  if (num === 0) return 'صفر';
  if (num === 1) return 'واحد';
  if (num === 2) return 'اثنان';
  
  const parts = [];
  
  // Billions
  const billions = Math.floor(num / 1000000000);
  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('مليارين');
    else if (billions >= 3 && billions <= 10) parts.push(convertHundreds(billions) + ' مليارات');
    else parts.push(convertHundreds(billions) + ' مليار');
    num %= 1000000000;
  }
  
  // Millions
  const millions = Math.floor(num / 1000000);
  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونين');
    else if (millions >= 3 && millions <= 10) parts.push(convertHundreds(millions) + ' ملايين');
    else parts.push(convertHundreds(millions) + ' مليون');
    num %= 1000000;
  }
  
  // Thousands
  const thousands = Math.floor(num / 1000);
  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفين');
    else if (thousands >= 3 && thousands <= 10) parts.push(convertHundreds(thousands) + ' آلاف');
    else parts.push(convertHundreds(thousands) + ' ألف');
    num %= 1000;
  }
  
  // Hundreds, Tens, Ones
  if (num > 0) {
    parts.push(convertHundreds(num));
  }
  
  return parts.join(' و');
}

/**
 * Converts a number 1-999 to Arabic words.
 */
function convertHundreds(num) {
  if (num === 0) return '';
  if (num < 20) return ONES[num];
  
  const parts = [];
  
  const hundreds = Math.floor(num / 100);
  if (hundreds > 0) {
    parts.push(HUNDREDS[hundreds]);
    num %= 100;
  }
  
  if (num > 0) {
    if (num < 20) {
      parts.push(ONES[num]);
    } else {
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      if (ones > 0) {
        parts.push(ONES[ones] + ' و' + TENS[tens]);
      } else {
        parts.push(TENS[tens]);
      }
    }
  }
  
  return parts.join(' و');
}

/**
 * Converts a monetary amount to Arabic words with currency.
 * @param {number} amount - The amount
 * @param {string} currency - Currency name (default: جنيه مصري)
 * @returns {string} e.g., "خمسة آلاف جنيه مصري"
 */
export function amountToArabicWords(amount, currency = 'جنيه مصري') {
  if (amount === undefined || amount === null || isNaN(amount)) return '';
  
  const num = Math.abs(Number(amount));
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  
  let result = numberToArabicWords(intPart) + ' ' + currency;
  
  if (decPart > 0) {
    result += ' و' + numberToArabicWords(decPart) + ' قرشًا';
  }
  
  if (amount < 0) {
    result = 'سالب ' + result;
  }
  
  return result;
}

export function formatCurrencyToArabic(amount, currency = 'جنيه مصري') {
  const words = amountToArabicWords(amount, currency);
  return words ? `فقط ${words} لا غير` : '';
}

/**
 * Formats a number with Arabic-Indic numerals.
 * @param {number|string} num
 * @returns {string}
 */
export function toArabicIndicNumerals(num) {
  if (num === undefined || num === null) return '';
  const arabicIndic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, d => arabicIndic[parseInt(d)]);
}
