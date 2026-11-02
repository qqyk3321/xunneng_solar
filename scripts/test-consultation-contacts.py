"""Run against a disposable local Postgres container; no cloud writes or emails."""
import concurrent.futures, pathlib, subprocess, sys, os, time
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else ROOT
CONTAINER=f'codex-contact-history-test-{os.getpid()}'
def sql(query):
    p=subprocess.run(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-X','-v','ON_ERROR_STOP=1','-At'],input=query,text=True,capture_output=True)
    if p.returncode: raise RuntimeError(p.stderr)
    return p.stdout.strip()
def main():
    subprocess.run(['docker','run','-d','--name',CONTAINER,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],check=True,capture_output=True)
    for _ in range(120):
        ready=subprocess.run(['docker','exec',CONTAINER,'pg_isready','-h','127.0.0.1','-U','postgres'],capture_output=True)
        if ready.returncode==0: break
        time.sleep(0.25)
    else: raise RuntimeError('Disposable database did not start')
    # This test container must be disposable and use a new database.
    sql('create role anon; create role authenticated; create role service_role bypassrls;')
    for name in ['20260915053253_baseline_tally_intake_v2.sql','20260915110417_add_consultation_email_audit.sql','20261008111802_add_tally_energy_inputs.sql']:
        sql((SOURCE/'supabase/migrations'/name).read_text())
    sql('''insert into public.tally_form_submissions(form_id,submission_id,submitted_at,country_code,name,email,phone,address,payload) values
    ('backfill','backfill-1','2026-10-01Z','AG','First',' BACKFILL@Example.Test ','12345678','{"full_address":"test"}','{}'),
    ('backfill','backfill-2','2026-10-02Z','AG','Different','backfill@example.test','12345678','{"full_address":"test"}','{}'),
    ('backfill','backfill-3','2026-10-02Z','DM','First','separate@example.test','12345678','{"full_address":"test"}','{}');''')
    sql((ROOT/'supabase/migrations/20261010105135_consultation_email_contacts.sql').read_text())
    sql((ROOT/'supabase/migrations/20261010112947_consultation_contacts_count_sort.sql').read_text())
    print(sql((ROOT/'supabase/tests/consultation_contacts.sql').read_text()).splitlines()[-1],flush=True)
    def insert(i):
        # Every distinct event is delivered twice, including concurrent retries.
        return sql(f'''begin;set local role service_role;
        insert into public.tally_form_submissions(form_id,submission_id,submitted_at,country_code,name,email,phone,address,payload)
        values('parallel','parallel-{i%20}','2026-10-01Z'::timestamptz + interval '{i%20} hour','AG','Name {i}','parallel@example.test','12345678','{{"full_address":"test"}}','{{}}')
        on conflict(form_id,submission_id) do nothing;commit;''')
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: list(pool.map(insert,range(40)))
    assert sql("select submission_count from public.consultation_contacts where email='parallel@example.test'")=='20'
    assert sql("select count(*) from public.tally_form_submissions where email_key='parallel@example.test'")=='20'
    # Corrections and deletions run concurrently without losing counts or timestamps.
    def change(i):
        if i<10:return sql(f"delete from public.tally_form_submissions where form_id='parallel' and submission_id='parallel-{i}'")
        return sql(f"update public.tally_form_submissions set submitted_at='2026-11-01Z' where form_id='parallel' and submission_id='parallel-{i}'")
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: list(pool.map(change,range(20)))
    assert sql("select submission_count=10 and latest_submitted_at='2026-11-01Z'::timestamptz from public.consultation_contacts where email='parallel@example.test'")=='t'
    print('PASS: parallel inserts, duplicate deliveries, timestamp corrections and deletes',flush=True)
    # Query plans must use the email/time index for history and the summary time index.
    for query,index in [("select id from public.tally_form_submissions where email_key='parallel@example.test' order by submitted_at desc,id desc limit 10",'tally_form_submissions_email_history_idx'),("select id from public.consultation_contacts order by latest_submitted_at desc,id limit 10",'consultation_contacts_latest_idx')]:
        plan=sql('set enable_seqscan=off;explain '+query)
        assert index in plan,plan
    print('PASS: indexed history and summary pagination',flush=True)
    for column,index in [('latest_submitted_at','consultation_contacts_latest_idx'),('submission_count','consultation_contacts_count_idx')]:
        for direction,tie in [('desc','asc'),('asc','desc')]:
            plan=sql(f'set enable_seqscan=off;explain select id from public.consultation_contacts order by {column} {direction},id {tie} limit 10')
            assert index in plan and 'Sort ' not in plan,plan
    print('PASS: time and count sorting use indexes in both directions',flush=True)

try:
    main()
finally:
    subprocess.run(['docker','rm','-f',CONTAINER],capture_output=True)
