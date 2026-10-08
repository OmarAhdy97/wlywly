import fs from 'fs';
import { generateDocumentModel, buildInitialFormValues } from '../src/lib/formulaEngine.js';
import { generateDocx } from '../src/lib/docxGenerator.js';
import { Packer } from 'docx';
const cat = JSON.parse(fs.readFileSync('src/data/legal_formulas.json', 'utf8'));
let ok = 0, fail = [];
for (const f of cat) {
  const vals = buildInitialFormValues(f, {});
  for (const fld of f.fields) if (fld.required && !vals[fld.key]) vals[fld.key] = 'قيمة تجريبية';
  const { model, errors } = generateDocumentModel(f, vals, {}, {});
  if (!model) { fail.push([f.id, errors[0]]); continue; }
  try { await generateDocx(model); ok++; } catch (e) { fail.push([f.id, String(e).slice(0, 80)]); }
}
console.log('docx ok', ok, 'fail', fail.length, fail.slice(0, 5));
const f = cat.find(x => x.id === 'formula_204');
const v = buildInitialFormValues(f, {});
Object.assign(v, { client_name: 'أدهم أحمد', client_address: 'دمياط', opponent_name: 'أحمد مصطفى', court_name: 'دمياط الجديدة الجزئية', document_title: 'عقد بيع ابتدائي', document_date: '2026-10-01', document_subject: 'بيع قطعة أرض' });
const r = generateDocumentModel(f, v, {}, {});
console.log(r.model.body.slice(0, 7).map(e => e.type + ': ' + (e.text || '').slice(0, 70)).join('\n'));
console.log(r.model.metadata.subject, r.model.metadata.layout);
