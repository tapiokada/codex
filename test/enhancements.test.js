import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID}from'node:crypto';
import {Engine}from'../engine.js';
import {character,levelGain}from'../progression.js';
import {studyPack,previousStudyPack}from'../questions.js';
const cmd=(e,b)=>e.command({command_id:randomUUID(),...b});
function fixture({level=1,xp=(level-1)*100,hp,pool='practice',count=3,failpoint}={}){
 const e=new Engine(':memory:',{failpoint});let s=e.load();s.level=level;s.experience=xp;e.save(s);
 assert.equal(cmd(e,{action:'start',pool,count,session_id:'s'}).status,200);
 const current=()=>{const snap=e.snapshot(),q=snap.current;return {session_id:'s',encounter_id:snap.active?.encounter_id,question_id:q?.id,revision:q?.revision,question_no:q?.question_no};};
 cmd(e,{action:'present',...current()});
 if(hp!==undefined){s=e.load();s.sessions[0].hp=hp;e.save(s);}
 const answer=(correct=true,extras={})=>{const snapshot=e.snapshot(),q=studyPack.questions.find(q=>q.id===snapshot.current.id);return cmd(e,{action:'answer',...current(),selected:correct?q.correct:[q.choices.find(c=>!q.correct.includes(c.id)).id],...extras});};
 return {e,current,answer};
}
const dbSnapshot=e=>({state:e.load(),commands:e.db.prepare('SELECT * FROM commands ORDER BY key').all(),audit:e.auditLog()});
test('collection viewing and repeated grading are entirely read-only, including audit and command history',()=>{
 const {e}=fixture();const before=dbSnapshot(e);const pack=e.load().packs[e.load().active_pack];
 for(const q of pack.questions.filter(q=>q.pool==='practice')){
  const input={pack_version:pack.version,question_id:q.id,revision:q.revision};const view=e.collectionView(input);
  for(const name of ['correct','explanation','choice_explanations','hint','takeaway','distractor_review'])assert.equal(view.question[name],undefined);
  const result=e.collectionAnswer({...input,selected:q.correct});assert.equal(result.result,'complete_correct');assert.equal(result.recorded,false);assert.equal(result.xp,0);assert.ok(result.choice_explanations);
  assert.deepEqual(e.collectionAnswer({...input,selected:q.correct}),result);
 }
 assert.deepEqual(dbSnapshot(e),before);
});
test('collection grading uses exact multi-selection, handles empty answers and rejects invalid input without writes',()=>{
 const e=new Engine(':memory:'),q=studyPack.questions.find(q=>q.pool==='practice'&&q.type==='multiple');const input={pack_version:studyPack.version,question_id:q.id,revision:q.revision};const before=dbSnapshot(e);
 assert.equal(e.collectionAnswer({...input,selected:[]}).result,'unanswered');assert.equal(e.collectionAnswer({...input,selected:[q.correct[0]]}).result,'partial_correct');
 for(const selected of [[q.correct[0],q.correct[0]],['missing'],null])assert.throws(()=>e.collectionAnswer({...input,selected}),/validation_failed/);
 assert.throws(()=>e.collectionAnswer({...input,revision:q.revision+1,selected:[]}),/question_not_found/);
 assert.throws(()=>e.collectionView({question_id:studyPack.questions.find(q=>q.pool.includes('boss')).id}),/question_not_found/);
 assert.deepEqual(dbSnapshot(e),before);
});
test('every question has two newly reviewed wrong options; answers, coverage and set membership remain stable',()=>{
 for(const q of studyPack.questions){const old=previousStudyPack.questions.find(old=>old.id===q.id);assert.equal(q.revision,old.revision+1);assert.equal(q.change_type,'semantic');assert.deepEqual(q.correct,old.correct);assert.deepEqual(q.exam_objectives,old.exam_objectives);assert.equal(q.practice_set,old.practice_set);
  const changed=q.choices.filter(c=>c.text!==old.choices.find(p=>p.id===c.id).text);assert.equal(changed.length,2,q.id);assert.ok(changed.every(c=>!q.correct.includes(c.id)));
  for(const c of changed){assert.notEqual(q.choice_explanations[c.id],old.choice_explanations[c.id]);assert.ok(q.choice_explanations[c.id].length>=30);}
 }
});
test('Lv2 applies HP/MP increases atomically and returns the learned elimination spell; replay changes nothing',()=>{
 const {e,current}=fixture({xp:90});const q=studyPack.questions.find(q=>q.id===e.snapshot().current.id);const body={action:'answer',...current(),selected:q.correct,command_id:'level-up'};
 const response=e.command(body);assert.equal(response.level_up.to,2);assert.equal(response.level_up.max_hp.delta,1);assert.equal(response.level_up.max_mp.delta,1);assert.deepEqual(response.level_up.learned_spells.map(s=>s.id),['eliminate']);
 const x=e.load().sessions[0];assert.equal(x.max_hp,6);assert.equal(x.hp,6);assert.equal(x.max_mp,4);assert.equal(x.mp,4);
 const after=e.load();assert.deepEqual(e.command(body),response);assert.deepEqual(e.load(),after);
});
test('Lv3 unlocks healing without MP increase, and ordinary answers do not fabricate level-up events',()=>{
 const {e,answer}=fixture({level:2,xp:190});const response=answer();assert.equal(response.level_up.to,3);assert.equal(response.level_up.max_mp.delta,0);assert.deepEqual(response.level_up.learned_spells.map(s=>s.id),['heal']);
 cmd(e,{action:'present',session_id:'s',encounter_id:e.snapshot().active.encounter_id,question_id:e.snapshot().current.id,revision:e.snapshot().current.revision,question_no:2});assert.equal(answer().level_up,null);
 assert.deepEqual(levelGain(1,4).learned_spells.map(s=>s.id),['eliminate','heal']);assert.equal(character(4).max_hp,8);assert.equal(character(4).max_mp,5);
});
test('level-up state and notification roll back when the success audit fails',()=>{
 let fail=false;const {e,answer}=fixture({xp:90,failpoint:stage=>{if(fail&&stage==='before_audit')throw Error('failure');}});const before=e.load();fail=true;
 assert.equal(answer().error,'transaction_failed');assert.deepEqual(e.load(),before);fail=false;assert.equal(answer().level_up.to,2);
});
test('HP zero remains a loss even if the wrong answer crosses a level threshold',()=>{
 const {e,answer}=fixture({xp:98,hp:1});assert.equal(answer(false).level_up.to,2);const x=e.snapshot().sessions[0];assert.equal(x.status,'lost');assert.equal(x.hp,0);assert.equal(x.max_hp,6);
});
test('locked spells, full HP healing, and boss spells reject without resource changes',()=>{
 const f=fixture();let before=f.e.load();assert.equal(cmd(f.e,{action:'support',...f.current(),support_type:'eliminate'}).error,'spell_locked');assert.deepEqual(f.e.load(),before);
 const g=fixture({level:3});before=g.e.load();assert.equal(cmd(g.e,{action:'support',...g.current(),support_type:'heal'}).error,'hp_full');assert.deepEqual(g.e.load(),before);
 const boss=fixture({level:3,pool:'domain_boss'});before=boss.e.load();assert.equal(cmd(boss.e,{action:'support',...boss.current(),support_type:'heal'}).error,'support_forbidden');assert.deepEqual(boss.e.load(),before);
});
test('elimination removes only a wrong option; healing spends MP once; supported answers earn assisted XP',()=>{
 const {e,current,answer}=fixture({level:3,hp:4});const q=studyPack.questions.find(q=>q.id===e.snapshot().current.id);const body={action:'support',...current(),support_type:'eliminate',command_id:'spell'};
 const first=e.command(body);assert.equal(first.status,200);assert.equal(first.eliminated_choices.length,1);assert.ok(!q.correct.includes(first.eliminated_choices[0]));const mp=e.snapshot().active.mp;assert.deepEqual(e.command(body),first);assert.equal(e.snapshot().active.mp,mp);
 assert.equal(cmd(e,{action:'support',...current(),support_type:'heal'}).status,200);assert.equal(e.snapshot().active.hp,6);assert.equal(e.snapshot().active.mp,mp-2);assert.equal(cmd(e,{action:'support',...current(),support_type:'heal'}).error,'already_used');
 const result=answer();assert.equal(result.attempt.is_assisted,true);assert.equal(result.attempt.xp,5);
});
test('legacy hint uses remain assisted and visible after new spell support format',()=>{
 const {e,current}=fixture({level:2});const s=e.load(),q=e.snapshot().current;s.sessions[0].supports[q.id]={type:'hint',used_at:'2026-10-28T00:00:00Z'};e.save(s);
 assert.ok(e.snapshot().current.hint);assert.equal(cmd(e,{action:'support',...current(),support_type:'eliminate'}).status,200);assert.ok(e.snapshot().current.hint);assert.deepEqual(e.snapshot().current.used_supports,['hint','eliminate']);
});
test('existing adventures with legacy fixed caps report their actual increases on next level-up',()=>{
 const {e,answer}=fixture({level:2,xp:190});const s=e.load();s.sessions[0].max_hp=5;s.sessions[0].hp=3;s.sessions[0].max_mp=3;s.sessions[0].mp=2;e.save(s);
 const response=answer();assert.deepEqual(response.level_up.max_hp,{before:5,after:7,delta:2});assert.deepEqual(response.level_up.max_mp,{before:3,after:4,delta:1});assert.equal(e.snapshot().active.hp,5);assert.equal(e.snapshot().active.mp,3);
});
