import {migrateModule,ModuleKey} from '@/lib/modules';
export const maxDuration=300;
export async function POST(req:Request){try{const b=await req.json();if((b.from&&!/^\d{2}\/\d{2}\/\d{4}$/.test(b.from))||(b.to&&!/^\d{2}\/\d{2}\/\d{4}$/.test(b.to)))return Response.json({error:'Format tanggal DD/MM/YYYY'},{status:400});const jobId=await migrateModule(b.module as ModuleKey,b.from||undefined,b.to||undefined);return Response.json({jobId})}catch(e:any){return Response.json({error:e.message},{status:500})}}
