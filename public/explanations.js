const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function link(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?esc(u.href):null;}catch{return null;}}
export function sourceHTML(sources=[]){
 if(!sources.length)return '<p class="muted">この旧問題には参照資料が登録されていません。</p>';
 return `<details class="references"><summary>参照資料（Microsoft Learn等を根拠にした独自問題）</summary><ul>${sources.map(s=>{
  const url=link(s.url),snapshot=link(s.source_url);
  return `<li>${url?`<a href="${url}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`:esc(s.title)}${snapshot?`<br><a class="snapshot-link" href="${snapshot}" target="_blank" rel="noopener noreferrer">${s.verification==='official_page_read'?'確認した公式ページ ↗':'確認した原文・固定バージョン ↗'}</a>`:''}<small>${esc(s.publisher??'')} · 内容確認 ${esc(s.checked_at??'未登録')}</small></li>`;
 }).join('')}</ul></details>`;
}
export function explanationHTML(item,selected=[]){
 const correct=new Set(item.correct??[]),chosen=new Set(selected);
 return `<section class="answer-explanation"><h3>解説</h3>${item.exam_objectives?.length?`<p class="muted">公式スキル対応：${item.exam_objectives.map(esc).join(" / ")}</p>`:""}<p>${esc(item.explanation)}</p>${item.takeaway?`<aside class="takeaway"><b>判断のポイント</b><p>${esc(item.takeaway)}</p></aside>`:''}${item.choice_explanations?`<h3>選択肢ごとの理由</h3><ol class="option-reasons">${(item.choices??[]).map(c=>`<li class="${correct.has(c.id)?'correct-option':'incorrect-option'}"><div><span class="tag">${esc(c.id)} · ${correct.has(c.id)?'正答':'誤答'}</span>${chosen.has(c.id)?'<span class="tag chosen-tag">あなたの選択</span>':''}</div><h4>${esc(c.text)}</h4><p>${esc(item.choice_explanations[c.id])}</p></li>`).join('')}</ol>`:'<p class="muted">この旧問題には選択肢ごとの解説が登録されていません。</p>'}${sourceHTML(item.sources)}</section>`;
}
