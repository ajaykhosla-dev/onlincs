"""Assembles supabase/migrations/011_phase8_notifications.sql.

The notification text must name the client and the idea, so the handful of earlier functions that insert
notifications are re-declared here with richer bodies. They are copied from the migrations that created them
(009 and 006) and patched, so the logic stays identical apart from the text.
"""
import re

def function_source(path, name):
    text = open(path, encoding='utf-8').read().replace('\r\n', '\n')
    start = text.index(f'create or replace function {name}(')
    end = text.index('end $$;', start) + len('end $$;')
    return text[start:end]

def patch(source, pairs):
    for old, new in pairs:
        assert old in source, old
        source = source.replace(old, new)
    return source

review = patch(function_source('supabase/migrations/009_phase6_review.sql', 'phase6_review_decision'), [
    ("'Changes requested',v_item.title||' · version '||v_version.version,'/editor/redo');",
     "'Changes requested',v_client.name||' · '||v_item.title||' · v'||v_version.version,'/editor/redo');"),
    ("insert into notifications(id,agency_id,user_id,type,title,body,link)",
     "insert into notifications(id,agency_id,user_id,type,title,body,link,actor_id)"),
    ("values(gen_random_uuid()::text,v_item.agency_id,v_item.assigned_editor_id,'revision',",
     "values(gen_random_uuid()::text,v_item.agency_id,v_item.assigned_editor_id,'revision',"),
    ("'/editor/redo');", "'/editor/redo',p_actor_id);"),
])
reopen = patch(function_source('supabase/migrations/009_phase6_review.sql', 'phase6_reopen_item'), [
    ("'Changes requested after approval',v_item.title,'/editor/redo');",
     "'Changes requested after approval',v_client.name||' · '||v_item.title,'/editor/redo',p_actor_id);"),
    ("insert into notifications(id,agency_id,user_id,type,title,body,link)",
     "insert into notifications(id,agency_id,user_id,type,title,body,link,actor_id)"),
])
# phase6_client_respond has slightly different literal text; patch by regex on the notification bodies instead.
respond = function_source('supabase/migrations/009_phase6_review.sql', 'phase6_client_respond')
respond = respond.replace("v_item.title||' · '||v_client.name", "v_client.name||' · '||v_item.title")
respond = respond.replace("'Client requested changes',v_item.title,'/editor/redo'", "'Client requested changes',v_client.name||' · '||v_item.title,'/editor/redo'")

arrival = function_source('supabase/migrations/006_phase4_shoots.sql', 'phase4_arrival')
arrival = patch(arrival, [
    ("'Raw footage arrived',v_item.title,'/editor/todo'", "'Raw footage arrived',v_client.name||' · '||v_item.title,'/editor/todo'"),
    ("'Shoot raw arrived',v_shoot.title,'/manager/calendar'", "'Shoot raw arrived',v_client.name||' · '||v_shoot.title,'/manager/calendar'"),
])

head = open('scripts/migration-parts/011_head.sql', encoding='utf-8').read()
tail = open('scripts/migration-parts/011_tail.sql', encoding='utf-8').read()
stale = open('scripts/migration-parts/011_staleness.sql', encoding='utf-8').read()
stale = open('scripts/migration-parts/011_staleness.sql', encoding='utf-8').read()
out = head + '\n-- ── Notification text names the client and the idea (re-declared from 006 / 009) ──\n' + '\n\n'.join([arrival, review, reopen, respond]) + '\n\n' + stale + '\n' + tail
open('supabase/migrations/011_phase8_notifications.sql', 'w', encoding='utf-8').write(out)
print('written', len(out))
