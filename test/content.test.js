import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Engine} from '../engine.js';
import {studyPack} from '../questions.js';
import sources from '../content/sources.json' with {type:'json'};
import {legacyPack} from '../test-support/legacy-pack.js';
import {explanationHTML,sourceHTML} from '../public/explanations.js';
const cmd=(e,b)=>e.command({command_id:randomUUID(),...b});
function begin(e,pool='practice',count=1){assert.equal(cmd(e,{action:'start',session_id:randomUUID(),pool,count}).status,200);const s=e.snapshot(),q=s.current;const b={session_id:s.active.id,encounter_id:s.active.encounter_id,question_no:q.question_no,question_id:q.id,revision:q.revision};assert.equal(cmd(e,{action:'present',...b}).status,200);return b;}
test('curriculum: 48 distinct original scenarios; disjoint pools and all six themes',()=>{
 assert.equal(studyPack.questions.length,48);assert.equal(new Set(studyPack.questions.map(q=>q.text)).size,48);
 assert.equal(new Set(studyPack.questions.map(q=>q.id)).size,48);
 for(const [pool,count]of Object.entries({practice:24,domain_boss:12,final_boss:6,diagnostic:6})){
  const qs=studyPack.questions.filter(q=>q.pool===pool);assert.equal(qs.length,count);assert.equal(new Set(qs.map(q=>q.domain)).size,6);
 }
 assert.ok(studyPack.questions.some(q=>q.pool==='practice'&&q.type==='multiple'));
 assert.deepEqual([...new Set(studyPack.questions.flatMap(q=>q.correct))].sort(),['A','B','C','D']);
});
test('every choice has an explanation and every scenario references checked Microsoft Learn source',()=>{
 const e=new Engine(':memory:');e.validatePack(studyPack);
 for(const q of studyPack.questions){assert.ok(q.objective);assert.ok(q.takeaway);assert.ok(q.sources.length);for(const c of q.choices)assert.ok(q.choice_explanations[c.id].length>=35,`${q.id}/${c.id}`);
  for(const s of q.sources){assert.equal(s.publisher,'Microsoft');assert.equal(s.verification,'official_repository_read');assert.match(s.source_url,/^https:\/\/github.com\/MicrosoftDocs\/learn\/blob\/[a-f0-9]{40}\//);assert.match(s.sha256,/^[a-f0-9]{64}$/);}
 }
 assert.equal(Object.keys(sources).length,23);
 assert.equal(e.snapshot().pack.exam_scope.status,'not_verified');
});
test('answer details never leak in a current question; accepted answers return all four rationales',()=>{
 for(const q of studyPack.questions){
  const e=new Engine(':memory:',{initialPack:{...studyPack,questions:[q]}}),b=begin(e,q.pool);
  const current=e.snapshot().current;
  for(const secret of ['correct','explanation','choice_explanations','takeaway'])assert.equal(current[secret],undefined,`${q.id}/${secret}`);
  assert.equal(current.hint,null);
  const r=cmd(e,{action:'answer',...b,selected:q.correct});assert.equal(r.status,200);assert.equal(r.attempt.result,'complete_correct');assert.deepEqual(r.choice_explanations,q.choice_explanations);assert.deepEqual(r.sources,q.sources);
  const history=e.snapshot().attempts[0];assert.deepEqual(history.choice_explanations,q.choice_explanations);assert.equal(history.objective,q.objective);
  e.db.close();
 }
});
test('every single/multiple wrong subset or distractor is not complete_correct',()=>{
 for(const q of studyPack.questions){
  const e=new Engine(':memory:',{initialPack:{...studyPack,questions:[q]}}),b=begin(e,q.pool);
  const selected=q.type==='multiple'?[q.correct[0]]:[q.choices.find(c=>!q.correct.includes(c.id)).id];
  const r=cmd(e,{action:'answer',...b,selected});assert.equal(r.status,200);assert.notEqual(r.attempt.result,'complete_correct');e.db.close();
 }
});
test('existing SAMPLE-1 history survives explicit pack update, and old adventure pins original questions',()=>{
 const e=new Engine(':memory:',{initialPack:legacyPack});const b=begin(e);const before=e.load();
 assert.equal(cmd(e,{action:'import',pack:studyPack}).error,'state_conflict');assert.deepEqual(e.load(),before);
 assert.equal(cmd(e,{action:'answer',...b,selected:['A']}).status,200);const xp=e.load().experience;
 assert.equal(cmd(e,{action:'import',pack:studyPack}).status,200);assert.equal(e.load().experience,xp);assert.equal(e.load().active_pack,studyPack.version);
 assert.equal(e.snapshot().attempts[0].text,'旧サンプル問題');assert.equal(e.snapshot().attempts[0].choice_explanations,null);
 assert.ok(e.load().packs['SAMPLE-1']);assert.equal(e.snapshot().builtin_pack.available,false);
});
test('incomplete rationales and unsafe source links reject imports atomically',()=>{
 const e=new Engine(':memory:');for(const invalid of [p=>delete p.questions[0].choice_explanations.A,p=>p.questions[0].sources[0].url='javascript:alert(1)',p=>p.questions[0].sources[0].source_url='https://user:secret@example.com']){
  const p=structuredClone(studyPack);p.version=randomUUID();invalid(p);const before=e.load();assert.equal(cmd(e,{action:'import',pack:p}).error,'validation_failed');assert.deepEqual(e.load(),before);
 }
});
test('explanation markup identifies selected/correct/wrong options and escapes imported content',()=>{
 const q=studyPack.questions[0],html=explanationHTML(q,[q.correct[0]]);assert.equal((html.match(/<li class=/g)||[]).length,4);assert.match(html,/あなたの選択/);assert.match(html,/誤答/);assert.match(html,/固定バージョン/);
 const unsafe=explanationHTML({correct:[],text:'',explanation:'<script>alert(1)</script>',sources:[{title:'<img src=x>',url:'javascript:alert(1)'}]},[]);
 assert.ok(!unsafe.includes('<script>'));assert.ok(!unsafe.includes('href="javascript:'));assert.match(unsafe,/&lt;script&gt;/);
 assert.match(sourceHTML([]),/旧問題/);
});
