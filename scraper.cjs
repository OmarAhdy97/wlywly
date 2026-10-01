const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function fetchBatch(startIndex, maxResults) {
  const url = `https://dalilelmohamy.blogspot.com/feeds/posts/default/-/%D8%B5%D9%8A%D8%BA?alt=json&start-index=${startIndex}&max-results=${maxResults}`;
  const tmpFile = path.join(__dirname, `batch_${startIndex}.json`);
  const cmd = `curl.exe -4 -s "${url}" -o "${tmpFile}"`;
  console.log(`Running curl for start-index ${startIndex}...`);
  execSync(cmd, { stdio: 'inherit' });
  const raw = fs.readFileSync(tmpFile, 'utf8');
  try { fs.unlinkSync(tmpFile); } catch (e) {}
  return JSON.parse(raw);
}

function cleanHtmlToText(html) {
  if (!html) return '';
  // decode common html entities
  let text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<xml[\s\S]*?<\/xml>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#160;/gi, ' ')
    .replace(/&#1548;/gi, '،')
    .replace(/&#1567;/gi, '؟')
    .replace(/&#187;/gi, '»')
    .replace(/&#171;/gi, '«');

  // decode any other &#dddd;
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));

  // normalize multiple newlines and trim whitespace
  text = text
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function classifyCategory(categories, title, content) {
  const catNames = categories.map(c => c.trim());
  
  if (catNames.includes('صيغ إيجارات') || /إيجار|طرد|إخلاء|عقد إيجار|المستأجر|المؤجر|تكليف بالوفاء/i.test(title)) {
    return 'صيغ إيجارات';
  }
  if (catNames.includes('صيغ دعاوي أحوال شخصية') || /نفقة|صداق|مؤخر|خلع|طلاق|حضانة|رؤية|عدة|أجور|متعة|نسب|ولاية|وصاية/i.test(title)) {
    return 'صيغ دعاوي أحوال شخصية';
  }
  if (catNames.includes('صيغ دعاوي جنائية') || /جنحة|جناية|تبديد|إيصال أمانة|شيك|سب وقذف|ضرب|نصب|سرقة|معارضة|استئناف جنائي|رد اعتبار/i.test(title)) {
    return 'صيغ دعاوي جنائية';
  }
  if (catNames.includes('صيغ دعاوي إدارية') || /إداري|قضاء إداري|مجلس دولة|طعن إلغاء|تأديب|قرار إداري|تسوية حالة/i.test(title)) {
    return 'صيغ دعاوي إدارية';
  }
  if (catNames.includes('صيغ عقود') || /عقد|اتفاق|مشاركة|بيع|شراء|إيجار|وكالة|صلح|رهن|تنازل|هبة|قسمة رضائية/i.test(title)) {
    return 'صيغ عقود';
  }
  if (catNames.includes('صيغ مرافعات') || /مرافعة|دفاع|مذكرة دفاع|دفوع|طعن بالنقض|التماس إعادة نظر/i.test(title)) {
    return 'صيغ مرافعات';
  }
  if (catNames.includes('صيغ دعاوي مدنية') || /صحة ونفاذ|صحة توقيع|فسخ|بطلان|تعويض|ريع|تثبيت ملكية|فرز وتجنيب|رد وبطلان/i.test(title)) {
    return 'صيغ دعاوي مدنية';
  }

  // fallback to one of categories if matched
  for (const c of catNames) {
    if (c !== 'صيغ') return c;
  }

  return 'صيغ دعاوي مدنية';
}

async function scrapeAll() {
  let allEntries = [];
  let startIndex = 1;
  const maxResults = 100;

  while (true) {
    console.log(`Fetching from index ${startIndex}...`);
    const data = fetchBatch(startIndex, maxResults);
    const entries = data.feed.entry || [];
    console.log(`Fetched ${entries.length} entries.`);
    if (entries.length === 0) break;
    allEntries = allEntries.concat(entries);
    if (entries.length < maxResults) break;
    startIndex += entries.length;
  }

  console.log(`Total entries collected: ${allEntries.length}`);

  const processed = allEntries.map((e, index) => {
    const title = (e.title ? e.title.$t : '').trim();
    const rawHtml = e.content ? e.content.$t : (e.summary ? e.summary.$t : '');
    const cleanText = cleanHtmlToText(rawHtml);
    const published = e.published ? e.published.$t : '';
    const updated = e.updated ? e.updated.$t : '';
    const categories = (e.category || []).map(c => c.term);
    const linkObj = (e.link || []).find(l => l.rel === 'alternate');
    const link = linkObj ? linkObj.href : '';

    const category = classifyCategory(categories, title, cleanText);

    return {
      id: `formula-${index + 1}`,
      title,
      category,
      originalCategories: categories,
      published,
      updated,
      link,
      cleanText,
      rawHtml: rawHtml.substring(0, 15000) // keep reasonable length if needed
    };
  });

  // Category counts
  const counts = {};
  processed.forEach(p => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });
  console.log('Category distribution:', counts);

  const outPath = path.join(__dirname, 'src', 'data', 'legal_formulas.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(processed, null, 2), 'utf8');
  console.log(`Saved ${processed.length} formulas to ${outPath}`);
}

scrapeAll().catch(console.error);
