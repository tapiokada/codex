import { rules } from './config.js';
export const spells=Object.freeze([
 {id:'hint',name:'ヒント',level:1,mp:1,description:'問題の判断ポイントを表示する'},
 {id:'eliminate',name:'見破り',level:2,mp:1,description:'不正解の選択肢を1つ除く'},
 {id:'heal',name:'ヒール',level:3,mp:2,description:'HPを2回復する（最大HPまで）'}
]);
export function character(level){return {level,max_hp:rules.hp+level-1,max_mp:rules.mp+Math.floor(level/2),spells:spells.filter(spell=>spell.level<=level)};}
export function levelGain(from,to){
 if(to<=from)return null;
 const before=character(from),after=character(to);
 return {from,to,max_hp:{before:before.max_hp,after:after.max_hp,delta:after.max_hp-before.max_hp},max_mp:{before:before.max_mp,after:after.max_mp,delta:after.max_mp-before.max_mp},learned_spells:spells.filter(spell=>spell.level>from&&spell.level<=to)};
}
export function supportUses(session,questionId){const entry=session.supports[questionId];return entry?.uses??(entry?[entry]:[]);}
