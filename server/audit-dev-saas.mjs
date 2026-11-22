// Run read-only before migrations. It never prints passwords, hashes, e-mails or tokens.
import pg from 'pg'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {writeFile} from 'node:fs/promises'
assert.equal(process.env.HUBPAGES_ENV,'development')
assert.equal(process.env.HUBPAGES_DEV_PUBLIC_ORIGIN||process.env.HUBPAGES_PUBLIC_ORIGIN,'https://dev.hubpages.com.br')
assert.equal(new URL(process.env.DATABASE_URL).hostname,'hubpages-db')
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1})
try{
 const c=await pool.connect();try{
 await c.query('BEGIN READ ONLY')
 const state=(await c.query('SELECT payload FROM hubpages_state WHERE id=1')).rows[0].payload
 const users=(await c.query('SELECT id,account_id,email,password_hash FROM hubpages_users')).rows
 const legacy=state.admin?.email?.toLowerCase()==='mjsnobre@hotmail.com',matches=users.filter(u=>u.email.toLowerCase()==='mjsnobre@hotmail.com')
 assert.equal(Number(legacy)+matches.length,1,'Principal identity must exist exactly once before role assignment')
 assert.ok(legacy?state.admin.passwordHash:matches[0].password_hash,'Existing principal password must be present')
 const tables=(await c.query("SELECT relname FROM pg_stat_user_tables WHERE relname LIKE 'hubpages_%' ORDER BY relname")).rows.map(r=>r.relname)
 const checkpoint={at:new Date().toISOString(),principal:legacy?'legacy-owner':matches[0].id,ownerId:legacy?'legacy-owner':matches[0].account_id,legacyPassword:createHash('sha256').update(state.admin?.passwordHash||'').digest('hex'),users:users.map(u=>({id:u.id,digest:createHash('sha256').update(u.password_hash).digest('hex')})),tables}
 await c.query('COMMIT')
 await writeFile('/data/saas-dev-preflight.json',JSON.stringify(checkpoint),{mode:0o600})
 console.log('DEV SaaS audit: '+JSON.stringify({principalVerified:true,principalKind:legacy?'existing-legacy-admin':'existing-customer',customerCount:users.length,tableCount:tables.length,tables,passwordsLogged:false}))
 }finally{c.release()}
}finally{await pool.end()}
