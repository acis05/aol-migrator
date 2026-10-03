import {accurateGet,accuratePost} from './aol';
import {initDb,pool} from './db';

export type ModuleKey='journal_voucher'|'sales_invoice'|'sales_receipt'|'purchase_invoice'|'purchase_payment'|'other_payment'|'other_deposit'|'glaccount'|'item'|'customer'|'vendor'|'fixed_asset';
export const MODULES:{key:ModuleKey;label:string;path:string;dateField?:string;ready:boolean;note?:string}[]=[
 {key:'journal_voucher',label:'Journal Voucher',path:'journal-voucher',dateField:'transDate',ready:true},
 {key:'sales_invoice',label:'Sales Invoice',path:'sales-invoice',dateField:'transDate',ready:true},
 {key:'sales_receipt',label:'Sales Receipt',path:'sales-receipt',dateField:'transDate',ready:true},
 {key:'purchase_invoice',label:'Purchase Invoice',path:'purchase-invoice',dateField:'transDate',ready:true},
 {key:'purchase_payment',label:'Purchase Payment',path:'purchase-payment',dateField:'transDate',ready:true},
 {key:'other_payment',label:'Other Payment',path:'other-payment',dateField:'transDate',ready:true},
 {key:'other_deposit',label:'Other Deposit',path:'other-deposit',dateField:'transDate',ready:true},
 {key:'glaccount',label:'COA / Akun Perkiraan',path:'glaccount',ready:true},
 {key:'item',label:'Item / Barang & Jasa',path:'item',ready:true},
 {key:'customer',label:'Customer',path:'customer',ready:true},
 {key:'vendor',label:'Vendor',path:'vendor',ready:true},
 {key:'fixed_asset',label:'Fixed Asset',path:'fixed-asset',ready:false,note:'Dokumen yang dilampirkan baru mencantumkan list/detail/delete. Skema bulk-save Fixed Asset belum tersedia, jadi sengaja tidak menebak parameter write API.'},
];

const DROP=new Set(['id','lastUpdate','createdByUserName','lastModifiedByUserName','createDate','lastUpdateDate','statusName','status','totalAmount','subTotal','taxAmount','remainingAmount','paymentAmountBase','balance','primeAmount']);
function clean(x:any):any{
 if(Array.isArray(x)) return x.map(clean);
 if(!x||typeof x!=='object') return x;
 const o:any={};
 for(const [k,v] of Object.entries(x)){
  if(DROP.has(k)||k.startsWith('_')||v===null||v===undefined) continue;
  if(typeof v==='object') {const z=clean(v); if(Array.isArray(z)?z.length:Object.keys(z||{}).length)o[k]=z}
  else o[k]=v;
 }
 return o;
}
function flatten(b:URLSearchParams,prefix:string,x:any){
 if(Array.isArray(x)){x.forEach((v,i)=>flatten(b,`${prefix}[${i}]`,v));return}
 if(x&&typeof x==='object'){Object.entries(x).forEach(([k,v])=>flatten(b,prefix?`${prefix}.${k}`:k,v));return}
 if(x!==''&&x!==null&&x!==undefined)b.append(prefix,String(x));
}
function encode(rows:any[]){const b=new URLSearchParams();rows.forEach((r,i)=>flatten(b,`data[${i}]`,clean(r)));return b}
function iso(s:string){const [d,m,y]=s.split('/');return `${y}-${m}-${d}`}
async function list(cfg:(typeof MODULES)[number],from?:string,to?:string){let page=1,out:any[]=[];while(true){const q:Record<string,string>={'fields':'id,number,no,name,transDate','sp.page':String(page),'sp.pageSize':'100','sp.sort':'id|asc'};if(cfg.dateField&&from&&to){q[`filter.${cfg.dateField}.op`]='BETWEEN';q[`filter.${cfg.dateField}.val[0]`]=from;q[`filter.${cfg.dateField}.val[1]`]=to}const j=await accurateGet('source',`/api/${cfg.path}/list.do`,q);out.push(...(j.d||[]));if(!j.sp||page>=j.sp.pageCount)break;page++}return out}
async function detail(cfg:(typeof MODULES)[number],id:any){return (await accurateGet('source',`/api/${cfg.path}/detail.do`,{id:String(id)})).d}
export async function migrateModule(key:ModuleKey,from?:string,to?:string){
 const cfg=MODULES.find(x=>x.key===key);if(!cfg)throw new Error('Modul tidak valid');if(!cfg.ready)throw new Error(cfg.note||'Modul belum siap');if(cfg.dateField&&(!from||!to))throw new Error('Periode wajib diisi untuk modul transaksi');
 await initDb();const s=(await pool.query("select database_id from selected_databases where role='source'")).rows[0],t=(await pool.query("select database_id from selected_databases where role='target'")).rows[0];if(!s||!t)throw new Error('Pilih source dan target database dahulu');if(String(s.database_id)===String(t.database_id))throw new Error('Source dan target tidak boleh database yang sama');
 const jr=await pool.query('insert into migration_jobs(module,source_mode,source_db_id,target_db_id,date_from,date_to,status) values($1,$2,$3,$4,$5,$6,\'RUNNING\') returning id',[key,'module_copy',s.database_id,t.database_id,from?iso(from):null,to?iso(to):null]);const job=jr.rows[0].id;
 try{const rows=await list(cfg,from,to);await pool.query('update migration_jobs set total=$1 where id=$2',[rows.length,job]);let ok=0,fail=0;for(let p=0;p<rows.length;p+=100){const src=rows.slice(p,p+100),good:any[]=[];for(const x of src){try{good.push(await detail(cfg,x.id))}catch(e:any){fail++;await pool.query("insert into migration_logs(job_id,source_id,source_number,status,message) values($1,$2,$3,'FAILED',$4)",[job,x.id,x.number||x.no||x.name,e.message])}}if(good.length){try{await accuratePost('target',`/api/${cfg.path}/bulk-save.do`,encode(good));ok+=good.length;for(const x of good)await pool.query("insert into migration_logs(job_id,source_id,source_number,status,message) values($1,$2,$3,'SUCCESS','Bulk save berhasil')",[job,x.id,x.number||x.no||x.name])}catch(e:any){fail+=good.length;for(const x of good)await pool.query("insert into migration_logs(job_id,source_id,source_number,status,message) values($1,$2,$3,'FAILED',$4)",[job,x.id,x.number||x.no||x.name,e.message])}}await pool.query('update migration_jobs set success=$1,failed=$2,updated_at=now() where id=$3',[ok,fail,job])}await pool.query('update migration_jobs set status=$1,updated_at=now() where id=$2',[fail?'COMPLETED_WITH_ERRORS':'COMPLETED',job]);return job}catch(e:any){await pool.query("update migration_jobs set status='FAILED',message=$1,updated_at=now() where id=$2",[e.message,job]);throw e}
}
