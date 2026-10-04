import assert from 'node:assert/strict'
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const shoot = await client.query("select id,title from shoots where id not like 'sh-%' order by scheduled_start desc limit 1")
  const item = await client.query("select id,status from content_items where id='ci-34'")
  const links = await client.query('select content_item_id from shoot_items where shoot_id=$1', [shoot.rows[0].id])
  console.log(`Before: ${shoot.rows[0].title}; candidate ci-34=${item.rows[0]?.status}; linked=${links.rows.map((r) => r.content_item_id).join(',')}`)
  const additions = await client.query("select entity_id,metadata from activity_log where action='item_added' order by created_at desc limit 3")
  console.log(`Recent add-idea events: ${JSON.stringify(additions.rows)}`)
  await client.query('begin')
  const added = await client.query("select phase4_add_shoot_item($1,'ci-34','u-1') as value", [shoot.rows[0].id])
  assert.equal(added.rows[0].value.id, 'ci-34')
  const after = await client.query('select count(*)::int n from shoot_items where shoot_id=$1', [shoot.rows[0].id])
  assert.equal(after.rows[0].n, links.rows.length + 1)
  console.log(`Rollback-only add succeeds; linked ideas would become ${after.rows[0].n}`)
} finally { await client.query('rollback'); await client.end() }
