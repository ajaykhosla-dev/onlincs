/**
 * Cross-tenant isolation and RLS tests (Phase 0, Step 9).
 *
 * These exercise RLS for real: each query runs as the `authenticated` Postgres role
 * with request.jwt.claims.sub set to a seeded user's linked Auth UUID, which is what PostgREST
 * does with a verified JWT. (The service role bypasses RLS, so it can prove nothing here.)
 *
 * Needs a database with the migrations applied:
 *   TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres npm test
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { Client } from 'pg'

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is not set — point it at a database with the migrations applied')

const local = /127\.0\.0\.1|localhost/.test(url)
const db = new Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: false } })
before(() => db.connect())
after(() => db.end())

const ASHMEET = 'ag-1'
const JASPREET = 'u-2', NIKHIL = 'u-3', ROHIT = 'u-5', HARPREET = 'u-7', ASHMEET_ADMIN = 'u-1'
const NS_ADMIN = 'u-9'
const ROLES: Record<string, string> = { admin: ASHMEET_ADMIN, brand_manager: JASPREET, editor: ROHIT, cameraman: HARPREET }

type Row = Record<string, unknown>

/** Run `fn` as an API caller inside a transaction that is always rolled back. */
async function as<T>(sub: string | null, fn: () => Promise<T>, setup?: () => Promise<void>): Promise<T> {
  await db.query('begin')
  try {
    if (setup) await setup() // runs as the connecting superuser, before the role switch
    const authId = sub === null ? null : (await db.query('select auth_user_id from users where id=$1', [sub])).rows[0]?.auth_user_id
    if (sub && !authId) throw new Error(`Missing Auth UUID for ${sub}`)
    await db.query(`set local role ${sub === null ? 'anon' : 'authenticated'}`)
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(authId ? { sub: authId, role: 'authenticated' } : {})])
    return await fn()
  } finally {
    await db.query('rollback')
  }
}

/** Query that returns rows, or the Postgres error code when the API role is not allowed to run it. */
async function tryQuery(sql: string, params: unknown[] = []): Promise<{ rows: Row[] } | { error: string }> {
  await db.query('savepoint q')
  try {
    const r = await db.query(sql, params)
    await db.query('release savepoint q')
    return { rows: r.rows }
  } catch (e) {
    await db.query('rollback to savepoint q')
    return { error: (e as { code?: string }).code ?? String(e) }
  }
}
const INSUFFICIENT_PRIVILEGE = '42501'

async function tenantTables(): Promise<string[]> {
  const r = await db.query(
    `select table_name from information_schema.columns
     where table_schema='public' and column_name='agency_id' order by 1`
  )
  return r.rows.map((x) => x.table_name as string)
}

test('every public table has RLS enabled', async () => {
  const r = await db.query(`select tablename from pg_tables where schemaname='public' and not rowsecurity`)
  assert.deepEqual(r.rows, [])
})

test('every table except agencies has a non-null agency_id FK (shoot_items is the known exception)', async () => {
  const r = await db.query(
    `select t.table_name from information_schema.tables t
     where t.table_schema='public' and t.table_type='BASE TABLE' and t.table_name <> 'agencies'
       and not exists (select 1 from information_schema.columns c
                       where c.table_schema='public' and c.table_name=t.table_name and c.column_name='agency_id' and c.is_nullable='NO')`
  )
  assert.deepEqual(r.rows.map((x) => x.table_name), ['shoot_items'])
})

test('covers at least 17 tables carrying agency_id', async () => {
  assert.ok((await tenantTables()).length >= 17)
})

test('no role ever sees another agency\'s rows, in any tenant table', async () => {
  const tables = await tenantTables()
  for (const [role, sub] of Object.entries(ROLES)) {
    await as(sub, async () => {
      for (const t of tables) {
        const res = await tryQuery(`select count(*)::int as n from ${t} where agency_id <> $1`, [ASHMEET])
        if ('error' in res) {
          assert.equal(res.error, INSUFFICIENT_PRIVILEGE, `${role}/${t}: unexpected error ${res.error}`)
        } else {
          assert.equal(res.rows[0].n, 0, `${role} saw other-agency rows in ${t}`)
        }
      }
      // shoot_items has no agency_id: every visible row must hang off an Ashmeet shoot
      const si = await tryQuery(
        `select count(*)::int as n from shoot_items si join shoots s on s.id = si.shoot_id where s.agency_id <> $1`, [ASHMEET])
      assert.equal('rows' in si && si.rows[0].n, 0, `${role} saw other-agency shoot_items`)
    })
  }
})

test('the reverse holds: Northside admin sees nothing of Ashmeet\'s', async () => {
  await as(NS_ADMIN, async () => {
    for (const t of await tenantTables()) {
      const res = await tryQuery(`select count(*)::int as n from ${t} where agency_id = $1`, [ASHMEET])
      if ('rows' in res) assert.equal(res.rows[0].n, 0, `Northside saw Ashmeet rows in ${t}`)
    }
  })
})

test('positive control: Ashmeet admin does see its own data, so zero-leak is not zero-everything', async () => {
  await as(ASHMEET_ADMIN, async () => {
    for (const t of ['users', 'clients', 'client_scope', 'content_items', 'monthly_plans', 'shoots', 'raw_files',
                     'deliverable_versions', 'comments', 'post_schedule', 'library_assets', 'activity_log']) {
      const res = await tryQuery(`select count(*)::int as n from ${t}`)
      assert.ok('rows' in res && (res.rows[0].n as number) > 0, `admin sees no rows in ${t}`)
    }
    const a = await tryQuery('select id from agencies')
    assert.deepEqual('rows' in a && a.rows.map((r) => r.id), [ASHMEET])
  })
})

test('Jaspreet sees exactly Ramana Dental and Grover Motors', async () => {
  await as(JASPREET, async () => {
    const r = await db.query('select name from clients order by name')
    assert.deepEqual(r.rows.map((x) => x.name), ['Grover Motors', 'Ramana Dental'])
  })
  await as(NIKHIL, async () => {
    const r = await db.query('select name from clients order by name')
    assert.deepEqual(r.rows.map((x) => x.name), ['Khanna Jewellers', 'Sandhu Interiors'])
  })
})

test('a manager sees content only for their clients', async () => {
  await as(JASPREET, async () => {
    const r = await db.query(`select distinct client_id from content_items order by 1`)
    assert.deepEqual(r.rows.map((x) => x.client_id), ['cl-1', 'cl-2'])
  })
})

test('an editor sees only their assignments, and only the clients those belong to', async () => {
  await as(ROHIT, async () => {
    const items = await db.query(`select count(*)::int n, count(*) filter (where assigned_editor_id <> $1)::int bad from content_items`, [ROHIT])
    assert.ok(items.rows[0].n > 0)
    assert.equal(items.rows[0].bad, 0)
    const own = await db.query(`select count(*)::int n from content_items where assigned_editor_id = $1`, [ROHIT])
    assert.equal(items.rows[0].n, own.rows[0].n)
    const shoots = await db.query('select count(*)::int n from shoots')
    assert.equal(shoots.rows[0].n, 0, 'editors have no access to shoots')
  })
})

test('a cameraman sees only their own shoots', async () => {
  await as(HARPREET, async () => {
    const r = await db.query(`select count(*)::int n, count(*) filter (where cameraman_id <> $1)::int bad from shoots`, [HARPREET])
    assert.ok(r.rows[0].n > 0)
    assert.equal(r.rows[0].bad, 0)
    const all = await db.query(`select count(*)::int n from shoots where agency_id = $1`, [ASHMEET])
    assert.ok((all.rows[0].n as number) < 6, 'cameraman must not see the whole agency\'s shoots')
  })
})

test('nobody reads upload_sessions.session_uri_enc through the API, for every role', async () => {
  const subs = [...Object.values(ROLES), NS_ADMIN]
  for (const sub of subs) {
    await as(sub, async () => {
      for (const sql of ['select session_uri_enc from upload_sessions', 'select * from upload_sessions',
                         `select id from upload_sessions where session_uri_enc is not null`]) {
        const res = await tryQuery(sql)
        assert.deepEqual(res, { error: INSUFFICIENT_PRIVILEGE }, `${sub}: "${sql}" must be denied`)
      }
      const ok = await tryQuery('select id, bytes_received, status, expires_at from upload_sessions')
      assert.ok('rows' in ok, `${sub}: non-secret columns should remain readable`)
    })
  }
})

test('the session URI cannot be written through the API either', async () => {
  await as(HARPREET, async () => {
    const res = await tryQuery(`update upload_sessions set session_uri_enc = 'x'`)
    assert.deepEqual(res, { error: INSUFFICIENT_PRIVILEGE })
  })
})

test('approval link hashes and integration credentials are unreadable by every API role', async () => {
  for (const sub of Object.values(ROLES)) {
    await as(sub, async () => {
      for (const sql of ['select token_hash from approval_links', 'select pin_hash from approval_links',
                         'select * from agency_integrations', 'select * from drive_sync_state']) {
        assert.deepEqual(await tryQuery(sql), { error: INSUFFICIENT_PRIVILEGE }, `${sub}: "${sql}"`)
      }
    })
  }
})

test('anon gets nothing', async () => {
  await as(null, async () => {
    for (const t of await tenantTables()) {
      const result = await tryQuery(`select 1 from ${t} limit 1`)
      assert.ok('error' in result ? result.error === INSUFFICIENT_PRIVILEGE : result.rows.length === 0, t)
    }
  })
})

test('writes are scoped too: no cross-manager edits, no cross-tenant inserts, no editor creating items', async () => {
  await as(JASPREET, async () => {
    const r = await db.query(`update clients set name = 'hacked' where id = 'cl-3'`) // Nikhil's client
    assert.equal(r.rowCount, 0)
  })
  await as(ASHMEET_ADMIN, async () => {
    const res = await tryQuery(
      `insert into clients (id, agency_id, code, name, handle, niche) values ('cl-x', 'ag-2', 'X', 'x', '@x', 'x')`)
    assert.ok('error' in res, 'admin of one agency must not insert into another')
  })
  await as(ROHIT, async () => {
    const res = await tryQuery(
      `insert into content_items (id, agency_id, client_id, title, slug, type, created_by)
       values ('ci-x', 'ag-1', 'cl-1', 't', 'x', 'reel', 'u-5')`)
    assert.ok('error' in res, 'editor must not create content items')
  })
})

test('workspace admins cannot reassign an Auth identity link', async () => {
  await as(ASHMEET_ADMIN, async () => {
    const result = await tryQuery('update users set auth_user_id=null where id=$1', ['u-2'])
    assert.ok('error' in result, 'Auth identity reassignment must be rejected')
  })
})

// ── Phase 11: platform tables and multi-tenant journeys ──────────────────────────────────────
test('platform-only tables are unreadable by every API role: credentials, support sessions, alert state, link views', async () => {
  for (const role of Object.keys(ROLES)) {
    await as(ROLES[role], async () => {
      for (const table of ['agency_integrations', 'support_sessions', 'alert_state', 'approval_link_views']) {
        const result = await tryQuery(`select 1 from ${table} limit 1`)
        assert.ok('error' in result ? result.error === INSUFFICIENT_PRIVILEGE : result.rows.length === 0, `${role} read ${table}`)
      }
    })
  }
})

test('an agency admin sees the platform audit trail of their own agency and never another agency\'s', async () => {
  const setup = async () => {
    await db.query(`insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action) values('qa-p11-a','ag-1','u-1','user','platform','ag-1','support_entered')`)
    await db.query(`insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action) values('qa-p11-b','ag-2','u-9','user','platform','ag-2','support_entered')`)
  }
  await as(ASHMEET_ADMIN, async () => {
    const rows = (await db.query(`select id from activity_log where entity_type='platform'`)).rows.map((r) => r.id)
    assert.ok(rows.includes('qa-p11-a')); assert.ok(!rows.includes('qa-p11-b'))
  }, setup)
  await as(NS_ADMIN, async () => {
    const rows = (await db.query(`select id from activity_log where entity_type='platform'`)).rows.map((r) => r.id)
    assert.ok(rows.includes('qa-p11-b')); assert.ok(!rows.includes('qa-p11-a'))
  }, setup)
})

test('notifications never cross agencies: an event in one agency creates nothing for the other', async () => {
  await as(null, async () => {}, async () => {
    const before = Number((await db.query(`select count(*) n from notifications where agency_id='ag-2'`)).rows[0].n)
    await db.query(`insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
      select 'qa-p11-n', 'ag-1', 'u-1', 'user', 'content_item', i.id, 'cut_submitted', '{"version":9}' from content_items i where i.agency_id='ag-1' limit 1`)
    const after = Number((await db.query(`select count(*) n from notifications where agency_id='ag-2'`)).rows[0].n)
    assert.equal(after, before, 'agency 2 received a notification caused by agency 1')
    const recipients = (await db.query(`select distinct u.agency_id from notifications n join users u on u.id=n.user_id where n.created_at > now() - interval '1 minute'`)).rows
    assert.ok(recipients.every((r) => r.agency_id === 'ag-1'))
  })
})

test('every notification, link and activity row belongs to the same agency as the user or item it points at', async () => {
  const mismatches = await db.query(`
    select 'notification' kind, count(*)::int n from notifications n join users u on u.id = n.user_id where u.agency_id <> n.agency_id
    union all select 'approval_link', count(*)::int from approval_links l join content_items i on i.id = l.content_item_id where i.agency_id <> l.agency_id
    union all select 'comment', count(*)::int from comments c join deliverable_versions v on v.id = c.version_id where v.agency_id <> c.agency_id
    union all select 'post', count(*)::int from post_schedule p join content_items i on i.id = p.content_item_id where i.agency_id <> p.agency_id
    union all select 'raw_file', count(*)::int from raw_files r join shoots s on s.id = r.shoot_id where s.agency_id <> r.agency_id`)
  for (const row of mismatches.rows) assert.equal(row.n, 0, `${row.kind} rows point across agencies`)
})
