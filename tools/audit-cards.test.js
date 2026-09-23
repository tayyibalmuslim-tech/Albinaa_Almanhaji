'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {extractCards, auditFile, front, back} = require('./audit-cards');
const cards = n => Array.from({length:n}, (_,i)=>({front:`ما الفائدة المستقلة من دراسة موضوع علمي محدد رقم ${i}؟`,back:'جواب مستقل.',level:2,anchor:'موضوع علمي',tags:'مرحلة::مادة::مقطع'}));
function audit(data, name='CARDS_DATA') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'anki-audit-'));
  const file = path.join(dir,'lecture.html');
  try {
    fs.writeFileSync(file, `const ${name} = ${JSON.stringify(data)};\n// #separator:tab #tags column:3 \\uFEFF`);
    return auditFile(file);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
test('reads all existing schemas and bracket characters in strings',()=>{
  for(const c of [{front:'س [ ]',back:'ج'},{q:'س [ ]',a:'ج'},{f:'س [ ]',b:'ج'},['س [ ]','ج']]){
    const got=extractCards(`const ankiCards = ${JSON.stringify([c])};`);
    assert.equal(front(got.data[0]),'س [ ]');assert.equal(back(got.data[0]),'ج');
  }
});
test('no arbitrary upper limit on independently useful cards',()=>{
  assert.deepEqual(audit(cards(65)).fail,[]);
});
test('validates metadata on every card, not the union of keys',()=>{
  const data=cards(25);delete data[10].level;delete data[10].anchor;data[10].tags='مرحلة أولى::مادة::مقطع';
  const errors=audit(data).fail.join('\n');
  assert.match(errors,/#11: level/);assert.match(errors,/#11: anchor/);assert.match(errors,/#11: Tags/);
});
test('flags legacy sources, duplicates and rote verse recall',()=>{
  const data=cards(25);data[1].front=data[0].front;data[2].front='في أي سورة ورد هذا النص؟';
  const errors=audit(data,'CARDS').fail.join('\n');
  assert.match(errors,/CARDS_DATA/);assert.match(errors,/مكرَّرة/);assert.match(errors,/سؤال حفظ/);
});
test('distinguishes a historical study circle from session recall',()=>{
  const data=cards(25);data[0].front='كيف كانت المسائل تناقش في الحلقة الفقهية لأبي حنيفة؟';
  assert.deepEqual(audit(data).fail,[]);
  data[0].front='ما الذي ذكر الشيخ في هذه المحاضرة؟';assert.match(audit(data).fail.join('\n'),/إحالة إلى الجلسة/);
});
test('enforces level quotas including the story maximum',()=>{
  const data=cards(25);data.slice(0,6).forEach(c=>c.level=5);
  assert.match(audit(data).fail.join('\n'),/القصص/);
});
