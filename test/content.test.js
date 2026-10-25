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
test('150 distinct practice questions in three disjoint, balanced 50-question sets',()=>{
 const practice=studyPack.questions.filter(q=>q.pool==='practice');
 assert.equal(studyPack.questions.length,174);assert.equal(practice.length,150);
 assert.equal(new Set(studyPack.questions.map(q=>q.text)).size,174);assert.equal(new Set(studyPack.questions.map(q=>q.id)).size,174);
 for(const [pool,count]of Object.entries({practice:150,domain_boss:12,final_boss:6,diagnostic:6}))assert.equal(studyPack.questions.filter(q=>q.pool===pool).length,count);
 const expected={plan:42,gen:48,vision:20,text:20,extract:20};
 for(const [domain,count]of Object.entries(expected))assert.equal(practice.filter(q=>q.official_domain===domain).length,count);
 for(const id of ['1','2','3']){
  const set=practice.filter(q=>q.practice_set===id);assert.equal(set.length,50);
  for(const domain of studyPack.exam_scope.domains){const share=set.filter(q=>q.official_domain===domain.id).length*2;const range=domain.weight.match(/[0-9]+/g).map(Number);assert.ok(share>=range[0]&&share<=range[1],`${id}/${domain.id}/${share}`);}
 }
 assert.ok(practice.some(q=>q.type==='multiple'));assert.deepEqual([...new Set(practice.flatMap(q=>q.correct))].sort(),['A','B','C','D']);
 const ids=new Set(studyPack.exam_scope.domains.flatMap(d=>d.objectives).map(o=>o.id));assert.equal(ids.size,64);
 const covered=new Set(practice.flatMap(q=>q.exam_objectives));assert.deepEqual([...covered].sort(),[...ids].sort());
 for(const q of studyPack.questions){assert.ok(q.exam_objectives.every(id=>ids.has(id)));assert.ok(q.exam_objectives.every(id=>id.startsWith(q.official_domain+'-')));}
});
test('every choice has an explanation and every scenario references checked Microsoft Learn source',()=>{
 const e=new Engine(':memory:');e.validatePack(studyPack);
 for(const q of studyPack.questions){assert.ok(q.objective);assert.ok(q.takeaway);assert.ok(q.sources.length);for(const c of q.choices)assert.ok(q.choice_explanations[c.id].length>=20,`${q.id}/${c.id}`);
  for(const s of q.sources){assert.equal(s.publisher,'Microsoft');assert.ok(['official_repository_read','official_page_read'].includes(s.verification));assert.ok(s.source_url.startsWith('https://github.com/MicrosoftDocs/learn/blob/')||s.source_url.startsWith('https://learn.microsoft.com/'));assert.match(s.sha256,/^[a-f0-9]{64}$/);}
 }
 assert.ok(Object.keys(sources).length>=40);
 assert.equal(e.snapshot().pack.exam_scope.status,'verified');assert.equal(e.snapshot().pack.exam_scope.skills_effective_at,'2026-04-16');
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
test('each 50-question set can be started and completed, and only uses its assigned questions',()=>{
 const e=new Engine(':memory:');const seen=new Set();
 for(const id of ['1','2','3']){
  const session=randomUUID();assert.equal(cmd(e,{action:'start',session_id:session,pool:'practice',count:50,practice_set:id}).status,200);
  const stored=e.load().sessions.find(x=>x.id===session);assert.equal(stored.questions.length,50);assert.equal(stored.practice_set,id);
  for(const key of stored.questions){const q=studyPack.questions.find(q=>q.id===key.id);assert.equal(q.practice_set,id);assert.ok(!seen.has(q.id));seen.add(q.id);}
  for(let i=0;i<50;i++){const snapshot=e.snapshot(),q=snapshot.current;const b={session_id:session,encounter_id:snapshot.active.encounter_id,question_id:q.id,revision:q.revision,question_no:q.question_no};assert.equal(cmd(e,{action:'present',...b}).status,200);const full=studyPack.questions.find(x=>x.id===q.id);assert.equal(cmd(e,{action:'answer',...b,selected:full.correct}).status,200);}
  const x=e.snapshot().sessions.find(x=>x.id===session);assert.equal(x.status,'won');assert.equal(x.answered_count,50);assert.equal(x.correct_count,50);assert.equal(x.unanswered_count,0);
 }
 assert.equal(seen.size,150);e.db.close();
});
test('set validation and counts are scoped to the selected pool and official domain',()=>{
 const e=new Engine(':memory:');const before=e.load();
 assert.equal(cmd(e,{action:'start',session_id:'bad1',pool:'domain_boss',count:1,practice_set:'1'}).error,'validation_failed');
 assert.equal(cmd(e,{action:'start',session_id:'bad2',pool:'practice',count:1,practice_set:'4'}).error,'validation_failed');
 assert.equal(cmd(e,{action:'start',session_id:'bad3',pool:'practice',count:51,practice_set:'1'}).error,'invalid_question_count');
 assert.deepEqual(e.load(),before);const vision=studyPack.exam_scope.domains.find(d=>d.id==='vision').label;
 assert.equal(cmd(e,{action:'start',session_id:'valid',pool:'practice',count:7,domain:vision,practice_set:'1'}).status,200);
 assert.equal(e.load().sessions[0].questions.length,7);e.db.close();
});
test('v1.1 pack upgrades without resetting prior experience, progress or archived explanations',async()=>{
 const {previousPack}=await import('../test-support/previous-pack.js');const e=new Engine(':memory:',{initialPack:previousPack});const b=begin(e),old=e.question(e.load(),e.load().sessions[0]);
 assert.equal(cmd(e,{action:'answer',...b,selected:old.correct}).status,200);const before=e.load(),xp=before.experience,progress=structuredClone(before.progress);
 assert.equal(cmd(e,{action:'import',pack:studyPack}).status,200);assert.equal(e.load().experience,xp);assert.deepEqual(e.load().progress,progress);
 assert.equal(e.snapshot().attempts[0].evaluated_revision,1);assert.equal(e.snapshot().attempts[0].text,old.text);assert.ok(e.load().packs[previousPack.version]);
 const current=studyPack.questions.find(q=>q.id===old.id);assert.equal(current.revision,2);assert.equal(current.change_type,'typographic');e.db.close();
});
