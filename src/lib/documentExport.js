/**
 * Legal Document Export Utility
 * Provides clean exports to:
 * 1. Word-compatible Document (.doc / .docx)
 * 2. Plain Text (.txt)
 */

/**
 * Exports document content as a real, editable Word-compatible document.
 * Includes Word-specific XML declarations, page setup (A4), margins, and Arabic RTL rules.
 *
 * @param {Object} documentData - { title, content, officeProfile }
 */
export function exportDocumentToDocx(documentData) {
  const { title = 'مستند_قانوني', content = '', officeProfile = {} } = documentData;

  const safeFilename = (title || 'مستند_قانوني')
    .replace(/[/\\:*?"<>|]/g, '_')
    .substring(0, 60);

  // Convert plain text newlines into styled Word HTML paragraphs
  const paragraphs = content
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        return '<p class="MsoNormal" style="margin-bottom: 8pt; line-height: 1.6;">&nbsp;</p>';
      }
      return `<p class="MsoNormal" dir="RTL" style="margin-bottom: 8pt; text-align: justify; line-height: 1.7; font-size: 14pt; font-family: 'Simplified Arabic', 'Traditional Arabic', Arial, sans-serif;">${trimmed.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    })
    .join('\n');

  const lawyerHeader = officeProfile.lawyer_name
    ? `<div style="text-align: right; border-bottom: 2px solid #37040a; padding-bottom: 6pt; margin-bottom: 18pt;">
        <p style="font-size: 16pt; font-weight: bold; color: #37040a; margin: 0;">${officeProfile.office_name || 'مكتب المحاماة'}</p>
        <p style="font-size: 12pt; color: #555; margin: 2pt 0 0 0;">الأستاذ/ ${officeProfile.lawyer_name} - ${officeProfile.lawyer_title || 'محامٍ ومستشار قانوني'}</p>
       </div>`
    : '';

  const wordDocumentHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 595.3pt 841.9pt; /* A4 Portrait */
      margin: 56.7pt 56.7pt 56.7pt 56.7pt; /* 2cm margins */
      mso-header-margin: 35.4pt;
      mso-footer-margin: 35.4pt;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body {
      direction: rtl;
      text-align: right;
      font-family: 'Simplified Arabic', 'Traditional Arabic', Arial, sans-serif;
      font-size: 14pt;
      color: #000000;
    }
    p.MsoNormal {
      margin: 0;
      line-height: 1.7;
    }
  </style>
</head>
<body lang="AR-EG" dir="RTL">
  <div class="Section1">
    ${lawyerHeader}
    ${paragraphs}
  </div>
</body>
</html>
  `.trim();

  // Blob with UTF-8 BOM so Microsoft Word displays Arabic text flawlessly
  const blob = new Blob(['\ufeff', wordDocumentHtml], {
    type: 'application/msword;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports document content as plain text (.txt).
 * @param {Object} documentData - { title, content }
 */
export function exportDocumentToTxt(documentData) {
  const { title = 'مستند_قانوني', content = '' } = documentData;
  const safeFilename = (title || 'مستند_قانوني')
    .replace(/[/\\:*?"<>|]/g, '_')
    .substring(0, 60);

  const blob = new Blob(['\ufeff', content], {
    type: 'text/plain;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
