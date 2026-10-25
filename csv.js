export function parseCSV(text,version){
 const rows=[];let row=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell.length)throw Error('invalid_csv');else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('invalid_csv');if(cell||row.length){row.push(cell);rows.push(row);}
 const header=rows.shift();const required=['id','revision','pool','domain','type','text','choices','correct','explanation','hint','change_type'];if(JSON.stringify(header)!==JSON.stringify(required))throw Error('invalid_csv_header');
 return {version,schema_version:1,app_version:1,questions:rows.map(r=>{if(r.length!==header.length)throw Error('invalid_csv_row');const q=Object.fromEntries(header.map((h,i)=>[h,r[i]]));q.revision=Number(q.revision);q.choices=JSON.parse(q.choices);q.correct=JSON.parse(q.correct);return q;})};
}
