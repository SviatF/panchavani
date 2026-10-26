#!/usr/bin/env python3
"""Guarded one-time legacy D1 ledger repair. Never alter application rows."""
import hashlib,json,os,re,subprocess,sys,urllib.request
import d1_schema_audit as audit

NAMES=audit.NAMES
DB_ID="38a2e5ce-b378-48f9-8efd-cbd309a770b7"
MISSING_INDEX="index/idx_private_handoff_state"
INDEX_SQL=("CREATE INDEX IF NOT EXISTS idx_private_handoff_state "
           "ON private_research_handoff_slots(status,created_at)")
TABLES=("job_requests","audit_log","runner_nonces","research_candidates",
        "autonomous_research_slots","autonomous_ai_slots","editorial_one_shot",
        "private_research_handoff_slots","automated_research_import_slots")

def choose_repair(schema,reference,journal):
    report=audit.assess(schema,reference,journal)
    if not report.get("migrationJournalExpected"):return "blocked-journal",report
    if report.get("differentDDLObjects") or report.get("unexpectedSchemaObjects"):
        return "blocked-ddl",report
    absent=set(report.get("missingSchemaObjects",[]))
    names=[x.get("name") for x in journal]
    if names==NAMES[:1] and absent=={MISSING_INDEX}:return "add-index-and-ledger",report
    if names==NAMES[:1] and not absent:return "ledger-only",report
    if names==NAMES and not absent:return "done",report
    return "blocked-schema",report

def checked_journal_columns(rows):
    names=[x.get("name") for x in rows]
    return (names==["id","name","applied_at"] and
            bool(rows[0].get("pk")) and
            "TEXT" in str(rows[1].get("type","")).upper() and
            bool(rows[2].get("dflt_value")))

def counts():
    statement=" UNION ALL ".join(
        "SELECT '"+t+"' AS table_name, COUNT(*) AS n FROM "+t for t in TABLES)
    rows=audit.remote_rows(statement)
    if set(r.get("table_name") for r in rows)!=set(TABLES):
        raise RuntimeError("Unexpected or unavailable legacy tables")
    return {r["table_name"]:int(r["n"]) for r in rows}

def bookmark():
    account=os.getenv("CLOUDFLARE_ACCOUNT_ID","")
    token=os.getenv("CLOUDFLARE_API_TOKEN","")
    if not re.fullmatch("[a-fA-F0-9]{32}",account) or len(token)<20:
        raise RuntimeError("Cloudflare account/token missing")
    req=urllib.request.Request(
        "https://api.cloudflare.com/client/v4/accounts/"+account+
        "/d1/database/"+DB_ID+"/time_travel/bookmark",
        headers={"Authorization":"Bearer "+token,"Accept":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=20) as response:
            result=json.load(response)
    except Exception:
        raise RuntimeError("D1 Time Travel bookmark unavailable; refusing writes") from None
    b=result.get("result",{}).get("bookmark") if result.get("success") else None
    if not isinstance(b,str) or not re.fullmatch("[0-9a-fA-F-]{40,100}",b):
        raise RuntimeError("D1 Time Travel bookmark unverified; refusing writes")
    summary=os.getenv("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary,"a",encoding="utf8") as f:
            f.write("### D1 recovery checkpoint\n\n")
            f.write("Database: panchavani-private. Time Travel bookmark: "+b+"\n\n")
            f.write("Restoring is destructive; do not restore automatically.\n\n")
    print("PASS: D1 recovery bookmark saved; SHA256 prefix "+
          hashlib.sha256(b.encode()).hexdigest()[:16])
    return b

def write_sql(sql,runner=subprocess.run):
    if any(x in sql.upper() for x in ("DROP TABLE","ALTER TABLE","DELETE FROM","UPDATE ")):
        raise RuntimeError("SQL statement not on safe-write allowlist")
    if sql!=INDEX_SQL and sql!=journal_insert():
        raise RuntimeError("Unrecognized SQL write")
    cmd=["npx","wrangler","d1","execute","panchavani-private",
         "--remote","--config","wrangler.jsonc","--json","--command",sql]
    p=runner(cmd,cwd=audit.ROOT/"admin",text=True,capture_output=True,
             timeout=75,check=False)
    if p.returncode!=0:raise RuntimeError("Remote D1 safe-write command failed")
    try:
        output=json.loads(p.stdout)
        if not isinstance(output,list) or len(output)!=1 or output[0].get("success") is not True:
            raise ValueError()
    except (ValueError,KeyError,TypeError):
        raise RuntimeError("Remote D1 write was not confirmed")

def journal_insert():
    return ("INSERT INTO d1_migrations(name) VALUES "+
            ",".join("('"+n+"')" for n in NAMES[1:]))

def state():
    return choose_repair(audit.remote_rows(audit.REMOTE_SQL),
                         audit.reference_schema(),audit.remote_rows(audit.JOURNAL_SQL))

def main():
    columns=audit.remote_rows(
        "SELECT name,type,pk,dflt_value FROM pragma_table_info('d1_migrations') ORDER BY cid")
    if not checked_journal_columns(columns):
        raise RuntimeError("Unknown D1 migration journal layout")
    selected,report=state()
    print("Initial schema:",json.dumps({"state":selected,
        "missing":report.get("missingSchemaObjects"),
        "journal":report.get("recordedMigrations")}))
    if selected not in ("add-index-and-ledger","ledger-only","done"):
        raise RuntimeError("D1 schema out of allowed repair scope")
    before=counts()
    bookmark()
    if selected=="add-index-and-ledger":
        write_sql(INDEX_SQL)
    selected,_=state()
    if selected not in ("ledger-only","done"):
        raise RuntimeError("Post-index DDL validation failed; journal unchanged")
    if counts()!=before:raise RuntimeError("Application row counts changed unexpectedly")
    if selected=="ledger-only":
        write_sql(journal_insert())
    selected,report=state()
    if selected!="done" or not report["pass"]:
        raise RuntimeError("Migration journal integrity mismatch")
    if counts()!=before:raise RuntimeError("Application row counts changed unexpectedly")
    print("PASS: legacy D1 tables and indexes match; migrations 0001-0006 recorded.")
    return 0

if __name__=="__main__":
    try:raise SystemExit(main())
    except Exception as err:
        print("BLOCKED: "+str(err),file=sys.stderr)
        raise SystemExit(2)
