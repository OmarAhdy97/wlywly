/**
 * Print Utilities for Legal Documents
 * Manages unique, descriptive document titles for browser print-to-PDF operations.
 */

export const DEFAULT_APP_TITLE = 'الأجندة القضائية — إدارة مكاتب المحاماة';

/**
 * Triggers window.print() with a unique, descriptive document title.
 * Sanitizes characters illegal in OS filenames (/ \ : * ? " < > |).
 * Reverts document.title to default after printing completes.
 *
 * @param {string} customTitle - The unique title for the PDF file
 */
export function printWithTitle(customTitle) {
  const originalTitle = document.title || DEFAULT_APP_TITLE;
  
  if (customTitle) {
    // Sanitize any characters illegal in Windows/macOS/Linux filenames
    const safeTitle = String(customTitle).replace(/[/\\:*?"<>|]/g, '-').trim();
    document.title = safeTitle;
  }

  window.print();

  const restore = () => {
    document.title = DEFAULT_APP_TITLE;
    window.removeEventListener('afterprint', restore);
  };

  window.addEventListener('afterprint', restore);

  // Fallback timer if afterprint event is cancelled or unsupported
  setTimeout(() => {
    document.title = DEFAULT_APP_TITLE;
  }, 2500);
}
