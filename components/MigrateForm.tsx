"use client";
import {useState} from "react";
export default function MigrateForm({ready}:{ready:boolean}){
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function go(e:any){e.preventDefault();const f=new FormData(e.currentTarget);const mode=String(f.get('mode'));
  if(mode==='all_transaction_journals'){setMsg('Mode Semua Jurnal Transaksi belum dapat dijalankan sampai endpoint sumber seluruh jurnal diberikan. /api/journal-voucher hanya berisi Jurnal Umum/Journal Voucher.');return}
  if(!confirm("Mulai migrasi Jurnal Voucher manual ke database target? Pastikan backup dan lakukan uji di database dummy terlebih dahulu."))return;
  setBusy(true);setMsg("");const r=await fetch('/api/migrate/journal-voucher',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({from:f.get('from'),to:f.get('to'),mode})});const j=await r.json();setBusy(false);if(r.ok)location.href=`/jobs/${j.jobId}`;else setMsg(j.error||'Gagal')}
 return <form onSubmit={go}>
  <label>Data yang dibawa<select name="mode" defaultValue="journal_voucher_only"><option value="journal_voucher_only">Hanya Jurnal Umum / Journal Voucher</option><option value="all_transaction_journals">Semua jurnal transaksi (menunggu endpoint sumber)</option></select></label>
  <p className="muted">Mode Journal Voucher membaca langsung /api/journal-voucher/list.do, sehingga tidak mengambil jurnal otomatis dari modul transaksi lain.</p>
  <div className="grid"><label>Dari tanggal<input name="from" placeholder="01/01/2026" required pattern="\\d{2}/\\d{2}/\\d{4}"/></label><label>Sampai tanggal<input name="to" placeholder="31/01/2026" required pattern="\\d{2}/\\d{2}/\\d{4}"/></label></div>
  <button disabled={!ready||busy}>{busy?'Sedang migrasi...':'Mulai Migrasi'}</button>{msg&&<p className="bad">{msg}</p>}
 </form>}
