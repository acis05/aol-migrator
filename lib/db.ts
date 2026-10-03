import { Pool } from "pg";
const g=globalThis as unknown as { pool?:Pool; init?:Promise<void> };
export const pool=g.pool ?? new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:undefined});
if(process.env.NODE_ENV!=="production") g.pool=pool;
export async function initDb(){ if(g.init) return g.init; g.init=(async()=>{await pool.query(`
CREATE TABLE IF NOT EXISTS oauth_connections(id text primary key, role text not null, access_token text not null, refresh_token text, expires_at timestamptz, scope text, created_at timestamptz default now(), updated_at timestamptz default now());
CREATE TABLE IF NOT EXISTS selected_databases(role text primary key, connection_id text not null, database_id bigint not null, alias text not null, host text, session_id text, updated_at timestamptz default now());
CREATE TABLE IF NOT EXISTS migration_jobs(id bigserial primary key, module text not null, source_db_id bigint not null, target_db_id bigint not null, date_from date, date_to date, status text not null default 'PENDING', total int default 0, success int default 0, failed int default 0, message text, created_at timestamptz default now(), updated_at timestamptz default now());
ALTER TABLE migration_jobs ADD COLUMN IF NOT EXISTS source_mode text not null default 'journal_voucher_only';
CREATE TABLE IF NOT EXISTS migration_logs(id bigserial primary key, job_id bigint references migration_jobs(id) on delete cascade, source_id bigint, source_number text, status text not null, target_id bigint, message text, created_at timestamptz default now());
`)} )(); return g.init; }
