import { DatabaseSync } from 'node:sqlite';
import { createHash, createHmac, randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { rules } from './config.js';
import { studyPack } from './questions.js';
import {character,levelGain,spells,supportUses} from './progression.js';
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const iso = t => new Date(t).toISOString();
class Rejection extends Error { constructor(reason,status=409){super(reason);this.status=status;} }
function grade(q,selected){
 if(!Array.isArray(selected)||selected.length!==new Set(selected).size||selected.some(id=>!q.choices.some(c=>c.id===id))||(q.type==='single'&&selected.length>1))throw new Rejection('validation_failed',400);
 return !selected.length?'unanswered':hash([...selected].sort())===hash([...q.correct].sort())?'complete_correct':q.type==='multiple'?'partial_correct':'incorrect';
}
export class Engine {
 constructor(path='data/quest.sqlite', {now=Date.now, failpoint=()=>{}, initialPack=studyPack}={}) {
  this.now=now; this.failpoint=failpoint;
  if(path!==':memory:') mkdirSync(dirname(path),{recursive:true});
  this.db=new DatabaseSync(path); this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  this.db.exec(`CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS commands (key TEXT PRIMARY KEY, request_hash TEXT NOT NULL, response TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT NOT NULL);`);
  if(!this.db.prepare('SELECT 1 FROM state').get()) this.save({schema_version:1,user_id:'local-learner',experience:0,level:1,active_pack:initialPack.version,packs:{[initialPack.version]:initialPack},sessions:[],attempts:[],progress:{}});
  if(path===':memory:') this.key=randomBytes(32); else {
   const keyPath=dirname(path)+'/backup.key';
   if(!existsSync(keyPath)) writeFileSync(keyPath,randomBytes(32),{mode:0o600,flag:'wx'});
   this.key=readFileSync(keyPath);
  }
 }
 load(){return JSON.parse(this.db.prepare('SELECT value FROM state WHERE id=1').get().value);}
 save(s){this.db.prepare('INSERT INTO state VALUES (1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(JSON.stringify(s));}
 audit(event, body, before, after, result, reason, tx, requestHash){
  this.db.prepare('INSERT INTO audit(value) VALUES (?)').run(JSON.stringify({event_type:event,user_id:'local-learner',session_id:body.session_id??null,adventure_id:body.session_id??null,boss_id:body.session_id??null,encounter_id:body.encounter_id??null,question_id:body.question_id??null,question_revision:body.revision??null,command_id:body.command_id,idempotency_scope:body.action,request_hash:requestHash,result,reason:reason??null,server_time:iso(this.now()),transaction_id:tx,before_state_hash:hash(before),after_state_hash:hash(after)}));
 }
 command(body){
  const {action,command_id}=body;
  if(!['start','present','answer','support','timeout','end','inn','abandon','import','restore'].includes(action)||typeof command_id!=='string'||!command_id||command_id.length>200) return {status:400,error:'validation_failed'};
  const scope=body.session_id??(action==='start'?body.session_id:body.pack?.version??body.backup?.backup_id??'user');
  const key=`${action}:${scope}:${command_id}`, requestHash=hash(body), tx=randomUUID();
  this.db.exec('BEGIN IMMEDIATE'); const before=this.load();
  try {
   const prev=this.db.prepare('SELECT * FROM commands WHERE key=?').get(key);
   if(prev){
    const same=prev.request_hash===requestHash;
    this.audit(same?'duplicate_replay':'idempotency_key_conflict',body,before,before,same?'duplicate_replay':'rejected',same?null:'idempotency_key_conflict',tx,requestHash);
    this.db.exec('COMMIT'); return same?JSON.parse(prev.response):{status:409,error:'idempotency_key_conflict'};
   }
   const s=structuredClone(before), payload=this.apply(s,body);
   this.failpoint('after_business'); this.save(s); this.failpoint('before_audit');
   this.audit(payload.event??action,body,before,s,payload.error?'rejected':'accepted',payload.error,tx,requestHash);
   const response={status:payload.error?409:200,...payload,transaction_id:tx};
   this.db.prepare('INSERT INTO commands VALUES (?,?,?)').run(key,requestHash,JSON.stringify(response));
   this.db.exec('COMMIT'); return response;
  } catch(e){
   this.db.exec('ROLLBACK'); const reason=e instanceof Rejection?e.message:'transaction_failed';
   const response={status:e.status??500,error:reason,transaction_id:tx};
   this.db.exec('BEGIN IMMEDIATE');
   try {this.audit(reason,body,before,before,'rejected',reason,tx,requestHash);
    if(reason!=='transaction_failed')this.db.prepare('INSERT OR IGNORE INTO commands VALUES (?,?,?)').run(key,requestHash,JSON.stringify(response));
    this.db.exec('COMMIT');
   }catch{this.db.exec('ROLLBACK');}
   return response;
  }
 }
 stats(s,x){const a=s.attempts.filter(a=>a.session_id===x.id);const correct=a.filter(a=>a.result==='complete_correct');return {planned_question_count:x.questions.length,presented_count:x.presented.length,answered_count:a.length,unanswered_count:x.presented.length-a.length,empty_answer_count:a.filter(a=>a.result==='unanswered').length,correct_count:correct.length,self_correct_count:correct.filter(a=>!a.is_assisted).length,assisted_correct_count:correct.filter(a=>a.is_assisted).length,answered_accuracy:a.length?correct.length/a.length:null,planned_accuracy:x.questions.length?correct.length/x.questions.length:null};}
 finish(s,x,status){if(x.status!=='in_progress')return;x.status=status;x.ended_at=iso(this.now());x.end_reason=status;x.end_state={...this.stats(s,x),experience:s.experience,ended_at:x.ended_at,end_reason:status};}
 question(s,x){const key=x.questions[x.current];return s.packs[x.pack_version].questions.find(q=>q.id===key.id&&q.revision===key.revision);}
 apply(s,b){
  const t=this.now();if(!Number.isFinite(t))throw new Rejection('time_unknown');
  if(b.action==='restore') return this.restore(s,b.backup);
  if(b.action==='import'){
   this.validatePack(b.pack);
   if(s.sessions.some(x=>x.status==='in_progress'))throw new Rejection('state_conflict');
   if(s.packs[b.pack.version])throw new Rejection('pack_version_exists');
   const old=s.packs[s.active_pack];
   for(const q of b.pack.questions){const prior=old.questions.find(p=>p.id===q.id);if(prior){if(q.revision<prior.revision)throw new Rejection('revision_rejected');if(hash(q)!==hash(prior)&&q.revision<=prior.revision)throw new Rejection('revision_rejected');if(q.revision>prior.revision&&!['typographic','semantic'].includes(q.change_type))throw new Rejection('revision_rejected');}}
   s.packs[b.pack.version]=b.pack;s.active_pack=b.pack.version;return {event:'pack_switched'};
  }
  if(b.action==='start'){
   if(s.sessions.some(x=>x.status==='in_progress'))throw new Rejection('active_session_exists');
   if(typeof b.session_id!=='string'||!b.session_id||s.sessions.some(x=>x.id===b.session_id))throw new Rejection('validation_failed');
   if(!['practice','domain_boss','final_boss','diagnostic'].includes(b.pool))throw new Rejection('validation_failed');
   const pack=s.packs[s.active_pack];
   const practiceSet=b.practice_set??null;
   if(practiceSet!==null&&(!['1','2','3'].includes(practiceSet)||b.pool!=='practice'))throw new Rejection('validation_failed');
   let questions=pack.questions.filter(q=>q.pool===b.pool&&(!b.domain||q.domain===b.domain)&&(!practiceSet||q.practice_set===practiceSet));
   const count=Number(b.count??5);if(!Number.isInteger(count)||count<1||count>questions.length)throw new Rejection('invalid_question_count');
   questions=questions.map(q=>({q,r:randomBytes(4).readUInt32BE()})).sort((a,b)=>a.r-b.r).slice(0,count).map(({q})=>({id:q.id,revision:q.revision}));
   const boss=b.pool.includes('boss'),profile=character(s.level),hp=b.pool==='practice'?profile.max_hp:rules.hp,mp=b.pool==='practice'?profile.max_mp:rules.mp;const x={id:b.session_id,encounter_id:randomUUID(),pool:b.pool,domain:b.domain??null,practice_set:practiceSet,pack_version:pack.version,questions,current:0,presented:[],supports:{},status:'in_progress',hp:boss?rules.bossHp:hp,max_hp:boss?rules.bossHp:hp,mp:boss?0:mp,max_mp:boss?0:mp,required_correct_count:boss?Math.ceil(count*.8):0,started_at:iso(t),deadline_at:boss?iso(t+rules.bossSeconds*1000):null};
   s.sessions.push(x);return {event:boss?'boss_started':'adventure_started',session_id:x.id};
  }
  const x=s.sessions.find(x=>x.id===b.session_id);if(!x)throw new Rejection('session_not_found',404);
  if(x.status!=='in_progress')throw new Rejection('already_ended');
  if(x.deadline_at&&t>Date.parse(x.deadline_at)){this.finish(s,x,'timed_out');return {event:'timeout_confirmed',error:b.action==='timeout'?undefined:'expired'};}
  if(b.action==='timeout')throw new Rejection('not_expired');
  const boss=x.pool.includes('boss');
  if(['end','inn','abandon'].includes(b.action)){
   if(b.action==='inn'){if(x.pool!=='practice')throw new Rejection('support_forbidden');x.hp=x.max_hp;x.mp=x.max_mp;}
   this.finish(s,x,b.action==='inn'?'returned_to_inn':'abandoned');return {event:b.action==='inn'?'returned_to_inn':'session_ended'};
  }
  const q=this.question(s,x);if(!q)throw new Rejection('archive_missing');
  if(b.question_no!==x.current+1||b.question_id!==q.id||b.revision!==q.revision||b.encounter_id!==x.encounter_id)throw new Rejection('state_conflict');
  const presented=x.presented.find(p=>p.question_no===x.current+1);
  if(b.action==='present'){
   if(presented)return {event:'duplicate_replay'};
   x.presented.push({question_no:x.current+1,question_id:q.id,revision:q.revision,presented_at:iso(t)});return {event:'question_presented'};
  }
  if(!presented)throw new Rejection('question_not_presented');
  if(b.action==='support'){
   if(x.pool!=='practice')throw new Rejection('support_forbidden');
   const spell=spells.find(spell=>spell.id===b.support_type);if(!spell)throw new Rejection('validation_failed');
   if(s.level<spell.level)throw new Rejection('spell_locked');
   const uses=supportUses(x,q.id);if(uses.some(use=>use.type===spell.id))throw new Rejection('already_used');
   if(x.mp<spell.mp)throw new Rejection('insufficient_resource');
   if(spell.id==='heal'&&x.hp===x.max_hp)throw new Rejection('hp_full');
   const eliminated=spell.id==='eliminate'?q.choices.find(choice=>!q.correct.includes(choice.id))?.id:null;
   if(spell.id==='eliminate'&&!eliminated)throw new Rejection('validation_failed');
   const use={type:spell.id,used_at:iso(t)};if(eliminated)use.eliminated_choice=eliminated;
   x.mp-=spell.mp;if(spell.id==='heal')x.hp=Math.min(x.max_hp,x.hp+2);
   x.supports[q.id]={uses:[...uses,use]};
   return {event:'support_used',support_type:spell.id,...(spell.id==='hint'?{hint:q.hint??'選択肢の条件と要件を比較しましょう。'}:{}),...(eliminated?{eliminated_choices:[eliminated]}:{})};
  }
  if(b.action!=='answer')throw new Rejection('validation_failed');
  if(boss&&(b.is_assisted||b.support_info))throw new Rejection('support_forbidden');
  const result=grade(q,b.selected),selected=[...b.selected].sort();
  if(s.attempts.some(a=>a.session_id===x.id&&a.question_no===x.current+1))throw new Rejection('already_processed');
  const assisted=!!x.supports[q.id]||!!b.is_assisted||!!b.support_info;
  const a={id:randomUUID(),session_id:x.id,encounter_id:x.encounter_id,question_id:q.id,question_no:x.current+1,evaluated_revision:q.revision,pool:x.pool,selected,result,is_assisted:assisted,answered_at:result==='unanswered'?null:iso(t),answer_duration_ms:result==='unanswered'?null:Math.max(0,t-Date.parse(presented.presented_at)),xp:0};
  s.attempts.push(a);
  if(['incorrect','partial_correct'].includes(result)&&x.pool!=='diagnostic')x.hp=Math.max(0,x.hp-1);
  const previousLevel=s.level;let levelUp=null;
  if(x.pool==='practice'&&result!=='unanswered'){
   let p=(Object.hasOwn(s.progress,q.id)?s.progress[q.id]:null)??{state:'unseen',consecutive_correct:0,next_review_at:null,revision:q.revision};
   if(p.revision!==q.revision&&q.change_type==='semantic')p={state:'unseen',consecutive_correct:0,next_review_at:null,revision:q.revision};
   else if(result==='complete_correct'){
    if(assisted){if(p.state==='unseen')p.state='assisted_mastery_pending';}
    else{p.consecutive_correct++;p.next_review_at=iso(t+rules.reviewDays[Math.min(p.consecutive_correct-1,rules.reviewDays.length-1)]*86400000);p.state='review_future';}
   }else{p.state='weak';p.consecutive_correct=0;}
   p.revision=q.revision;s.progress[q.id]=p;
   a.xp=result==='complete_correct'?(assisted?rules.xpAssisted:rules.xpCorrect):rules.xpIncorrect;s.experience+=a.xp;s.level=1+Math.floor(s.experience/rules.xpPerLevel);
  }
  levelUp=levelGain(previousLevel,s.level);
  if(levelUp){
   const target=character(s.level);
   // Legacy adventures can still have fixed caps; report their actual increase.
   levelUp.max_hp={before:x.max_hp,after:Math.max(x.max_hp,target.max_hp),delta:Math.max(0,target.max_hp-x.max_hp)};
   levelUp.max_mp={before:x.max_mp,after:Math.max(x.max_mp,target.max_mp),delta:Math.max(0,target.max_mp-x.max_mp)};
   x.max_hp=levelUp.max_hp.after;x.max_mp=levelUp.max_mp.after;
   if(x.hp>0)x.hp=Math.min(x.max_hp,x.hp+levelUp.max_hp.delta);x.mp=Math.min(x.max_mp,x.mp+levelUp.max_mp.delta);
  }
  x.current++;
  if(x.hp===0)this.finish(s,x,'lost');else if(x.current===x.questions.length)this.finish(s,x,boss&&this.stats(s,x).correct_count<x.required_correct_count?'lost':'won');
  return {event:result==='unanswered'?'unanswered_accepted':boss?'boss_answer_accepted':'answer_accepted',attempt:a,correct:q.correct,level_up:levelUp,...this.review(q)};
 }
 validatePack(p){
  if(!p||typeof p.version!=='string'||!p.version||p.version.length>100||p.schema_version!==1||p.app_version!==1||!Array.isArray(p.questions)||!p.questions.length||p.questions.length>2000)throw new Rejection('validation_failed',400);
  const ids=new Set();for(const q of p.questions){
   if(!q||typeof q.id!=='string'||!q.id||['__proto__','constructor','prototype'].includes(q.id)||ids.has(q.id)||!Number.isInteger(q.revision)||q.revision<1||!['practice','domain_boss','final_boss','diagnostic'].includes(q.pool)||!['single','multiple'].includes(q.type)||typeof q.text!=='string'||!q.text||typeof q.domain!=='string'||typeof q.explanation!=='string'||!Array.isArray(q.choices)||q.choices.length<2||!Array.isArray(q.correct)||!q.correct.length)throw new Rejection('validation_failed',400);
   if(q.choice_explanations!==undefined && (!q.choice_explanations||Array.isArray(q.choice_explanations)||q.choices.some(c=>typeof q.choice_explanations[c.id]!=='string'||!q.choice_explanations[c.id].trim())||Object.keys(q.choice_explanations).length!==q.choices.length))throw new Rejection('validation_failed',400);
   if(q.sources!==undefined && (!Array.isArray(q.sources)||q.sources.some(source=>{try{return typeof source.title!=='string'||!source.title.trim()||typeof source.url!=='string'||![source.url,source.source_url].filter(Boolean).every(link=>{const u=new URL(link);return u.protocol==='https:'&&!u.username&&!u.password;});}catch{return true;}})))throw new Rejection('validation_failed',400);
   if(q.practice_set!==undefined&&(q.pool!=='practice'||!['1','2','3'].includes(q.practice_set)))throw new Rejection('validation_failed',400);
   if(q.exam_objectives!==undefined&&(!Array.isArray(q.exam_objectives)||q.exam_objectives.some(id=>typeof id!=='string'||!/^([a-z]+)-[0-9]{2}$/.test(id))))throw new Rejection('validation_failed',400);
   if(q.difficulty!==undefined&&!['intermediate','advanced'].includes(q.difficulty))throw new Rejection('validation_failed',400);
   ids.add(q.id);const choices=new Set(q.choices.map(c=>c.id));if(choices.size!==q.choices.length||q.choices.some(c=>typeof c.id!=='string'||typeof c.text!=='string')||new Set(q.correct).size!==q.correct.length||q.correct.some(c=>!choices.has(c))||(q.type==='single'&&q.correct.length!==1))throw new Rejection('validation_failed',400);
  }
 }
 collectionQuestion({pack_version,question_id,revision}){
  const s=this.load(),version=pack_version??s.active_pack,pack=s.packs[version];
  const q=pack?.questions?.find(q=>q.id===question_id&&(revision===undefined||q.revision===revision));
  if(!q||q.pool!=='practice')throw new Rejection('question_not_found',404);
  return {q,pack_version:version};
 }
 questionView(q){
  const fields=['id','revision','pool','domain','objective','text','type','difficulty','sources','exam_objectives','official_domain','practice_set','topic'];
  return {...Object.fromEntries(fields.filter(key=>q[key]!==undefined).map(key=>[key,q[key]])),choices:q.choices.map(({id,text})=>({id,text}))};
 }
 collectionView(input){const {q,pack_version}=this.collectionQuestion(input);return {question:this.questionView(q),pack_version,recorded:false};}
 collectionAnswer(input){if(!input.pack_version||!Number.isInteger(input.revision))throw new Rejection('validation_failed',400);const {q,pack_version}=this.collectionQuestion(input);return {result:grade(q,input.selected),selected:input.selected,correct:q.correct,...this.review(q),pack_version,recorded:false,xp:0};}
 review(q){return {text:q.text,domain:q.domain,explanation:q.explanation,choices:q.choices,choice_explanations:q.choice_explanations??null,takeaway:q.takeaway??null,sources:q.sources??[],objective:q.objective??null,difficulty:q.difficulty??null,exam_objectives:q.exam_objectives??[]};}
 snapshot(){const s=this.load();const active=s.sessions.find(x=>x.status==='in_progress');const pack=s.packs[s.active_pack];
  const progress=pack.questions.filter(q=>q.pool==='practice').map(q=>{let p=(Object.hasOwn(s.progress,q.id)?s.progress[q.id]:null)??{state:'unseen',consecutive_correct:0,next_review_at:null,revision:q.revision};return {question_id:q.id,domain:q.domain,text:q.text,...p,state:p.state==='review_future'&&Date.parse(p.next_review_at)<=this.now()?'review_due':p.state};});
  const sessions=s.sessions.map(x=>({...x,...this.stats(s,x),questions:undefined,supports:undefined,presented:undefined}));
  let current=null;if(active){const q=this.question(s,active);if(q){const {hint}=q;current={...this.questionView(q),question_no:active.current+1,presented:active.presented.some(p=>p.question_no===active.current+1),assisted:!!active.supports[q.id],used_supports:supportUses(active,q.id).map(use=>use.type),eliminated_choices:supportUses(active,q.id).filter(use=>use.type==='eliminate').map(use=>use.eliminated_choice),hint:supportUses(active,q.id).some(use=>use.type==='hint')?hint:null};}}
  return {builtin_pack:{version:studyPack.version,title:studyPack.title,question_count:studyPack.questions.length,practice_count:studyPack.questions.filter(q=>q.pool==='practice').length,available:!s.packs[studyPack.version]},schema_version:1,server_time:iso(this.now()),experience:s.experience,level:s.level,character:character(s.level),pack:{version:pack.version,sample:!!pack.sample,title:pack.title??pack.version,exam_scope:pack.exam_scope??null,sources:[...new Map(pack.questions.flatMap(q=>q.sources??[]).map(source=>[source.source_url??source.url,source])).values()],question_count:pack.questions.length,practice_sets:['1','2','3'].map(id=>({id,count:pack.questions.filter(q=>q.pool==='practice'&&q.practice_set===id).length,domain_counts:Object.fromEntries([...new Set(pack.questions.map(q=>q.domain))].map(domain=>[domain,pack.questions.filter(q=>q.pool==='practice'&&q.practice_set===id&&q.domain===domain).length]))})).filter(set=>set.count>0),objective_counts:Object.fromEntries((pack.exam_scope?.domains??[]).flatMap(d=>d.objectives).map(o=>[o.id,pack.questions.filter(q=>q.pool==='practice'&&q.exam_objectives?.includes(o.id)).length])),domain_counts:Object.fromEntries(['practice','domain_boss','final_boss','diagnostic'].map(pool=>[pool,Object.fromEntries([...new Set(pack.questions.map(q=>q.domain))].map(domain=>[domain,pack.questions.filter(q=>q.pool===pool&&q.domain===domain).length]))])),pools:Object.fromEntries(['practice','domain_boss','final_boss','diagnostic'].map(pool=>[pool,pack.questions.filter(q=>q.pool===pool).length]))},domains:[...new Set(pack.questions.map(q=>q.domain))],progress,sessions:sessions.reverse(),active:active?sessions.find(x=>x.id===active.id):null,current,attempts:s.attempts.map(a=>{const session=s.sessions.find(x=>x.id===a.session_id);const q=s.packs[session.pack_version].questions.find(q=>q.id===a.question_id&&q.revision===a.evaluated_revision);return {...a,...this.review(q),correct:q.correct};}).reverse()};
 }
 backup(){const payload={schema_version:1,backup_id:randomUUID(),created_at:iso(this.now()),state:this.load(),commands:this.db.prepare('SELECT * FROM commands').all()};return {...payload,signature:createHmac('sha256',this.key).update(JSON.stringify(payload)).digest('hex')};}
 restore(s,b){
  if(!b||typeof b.signature!=='string')throw new Rejection('restore_validation_failed');
  const {signature,...payload}=b;const expected=createHmac('sha256',this.key).update(JSON.stringify(payload)).digest('hex');
  if(!/^[a-f0-9]{64}$/.test(signature)||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected))||payload.schema_version!==1)throw new Rejection('restore_validation_failed');
  const r=payload.state;try {
   if(r.schema_version!==1||r.user_id!=='local-learner'||!r.packs[r.active_pack]||!Number.isInteger(r.experience)||r.experience<0||r.level!==1+Math.floor(r.experience/rules.xpPerLevel)||r.sessions.filter(x=>x.status==='in_progress').length>1)throw Error();
   Object.values(r.packs).forEach(p=>this.validatePack(p));
   const attempts=new Set();for(const a of r.attempts){const x=r.sessions.find(x=>x.id===a.session_id);const q=r.packs[x.pack_version].questions.find(q=>q.id===a.question_id&&q.revision===a.evaluated_revision);if(!q||!x.presented.some(p=>p.question_no===a.question_no&&p.question_id===q.id)||attempts.has(`${x.id}:${a.question_no}`)||!['unanswered','complete_correct','incorrect','partial_correct'].includes(a.result)||(a.result==='unanswered'?(a.answered_at!==null||a.answer_duration_ms!==null):!Number.isFinite(Date.parse(a.answered_at))))throw Error();attempts.add(`${x.id}:${a.question_no}`);}
   for(const x of r.sessions){const stats=this.stats(r,x);if(!r.packs[x.pack_version]||x.current!==stats.answered_count||stats.unanswered_count<0||new Set(x.presented.map(p=>p.question_no)).size!==x.presented.length||x.questions.some(k=>!r.packs[x.pack_version].questions.some(q=>q.id===k.id&&q.revision===k.revision)))throw Error();if(x.status!=='in_progress'&&(!x.end_state||x.end_reason!==x.status||Object.keys(stats).some(k=>stats[k]!==x.end_state[k])))throw Error();}
   if(!Array.isArray(payload.commands))throw Error();
  }catch{throw new Rejection('restore_validation_failed');}
  Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,r);
  // Restore the command timeline with the business state; audit history remains append-only.
  this.db.prepare('DELETE FROM commands').run();
  for(const c of payload.commands)this.db.prepare('INSERT OR IGNORE INTO commands VALUES (?,?,?)').run(c.key,c.request_hash,c.response);
  return {event:'restore_succeeded'};
 }
 auditLog(){return this.db.prepare('SELECT value FROM audit ORDER BY id DESC LIMIT 300').all().map(x=>JSON.parse(x.value));}
}
