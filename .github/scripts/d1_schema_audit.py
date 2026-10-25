#!/usr/bin/env python3
"""READ-ONLY: compare live D1 DDL with a fresh replay of migration 0001-0006.

No raw user data are queried, exported or modified. Always fail closed.
This is a release gate, NOT a repair tool. It only reports what can safely
be considered previously installed migration DDL.
"""
import json
import pathlib
import re
import sqlite3
import subprocess
import sys

HERE=pathlib.Path(__file__).resolve()
ROOT=HERE.parents[2]
MIGRATIONS=ROOT/"admin"/"migrations"
NAMES=[
 "0001_private_jobs.sql","0002_private_runner.sql",
 "0003_autonomous_research.sql","0004_one_shot_editorial.sql",
 "0005_private_handoff.sql","0006_automated_research_import.sql"]
REMOTE_SQL=(
 "SELECT type,name,tbl_name,sql FROM sqlite_master "
 "WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' "
 "AND name NOT IN ('_cf_KV','d1_migrations') "
 "AND tbl_name NOT IN ('_cf_KV','d1_migrations') "
 "ORDER BY type,name")
JOURNAL_SQL="SELECT name FROM d1_migrations ORDER BY name"
LOCAL_SQL=(
 "SELECT type,name,tbl_name,sql FROM sqlite_master "
 "WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' "
 "ORDER BY type,name")
 
def ddl_norm(raw):
    """Conservative normalization: trim whitespace, preserve SQL text."""
    if not isinstance(raw,str): return ""
    return re.sub(r"\s+"," ",raw.strip()).lower()

def reference_schema():
    db=sqlite3.connect(":memory:")
    try:
        for name in NAMES:
            db.executescript((MIGRATIONS/name).read_text(encoding="utf-8"))
        return [dict(zip(["type","name","tbl_name","sql"],r)) for r in db.execute(LOCAL_SQL)]
    finally:
        db.close()

def remote_rows(query,runner=subprocess.run):
    cmd=["npx","wrangler","d1","execute","panchavani-private",
         "--remote","--config","wrangler.jsonc","--json","--command",query]
    p=runner(cmd,cwd=ROOT/"admin",capture_output=True,text=True,timeout=60,check=False)
    if p.returncode!=0:
        raise RuntimeError("Remote D1 read-only query failed (error details intentionally suppressed)")
    try:
        payload=json.loads(p.stdout)
        if not isinstance(payload,list) or len(payload)!=1 or payload[0].get("success") is not True:
            raise ValueError("Unexpected provider response")
        return payload[0]["results"]
    except (ValueError,KeyError,TypeError) as exc:
        raise RuntimeError("Invalid remote D1 read-only response") from exc

def assess(remote,reference,journal):
    def bykey(rows):
        table={}
        for row in rows:
            if set(("type","name","tbl_name","sql"))-row.keys():
                return None
            key=(row["type"],row["name"])
            if key in table: return None
            table[key]=row
        return table
    local=bykey(reference)
    actual=bykey(remote)
    if local is None or actual is None:
        return {"pass":False,"reason":"malformed-schema-items"}
    only_local=sorted(set(local)-set(actual))
    only_remote=sorted(set(actual)-set(local))
    differing=sorted(k for k in set(local)&set(actual)
        if local[k]["tbl_name"]!=actual[k]["tbl_name"] or
           ddl_norm(local[k]["sql"])!=ddl_norm(actual[k]["sql"]))
    entries=[x.get("name") for x in journal]
    journal_ok=(entries==[NAMES[0]]) or (entries==NAMES)
    return {
        "pass":not (only_local or only_remote or differing) and journal_ok,
        "expectedObjects":len(local),"actualObjects":len(actual),
        "missingSchemaObjects":[f"{a}/{b}" for a,b in only_local],
        "unexpectedSchemaObjects":[f"{a}/{b}" for a,b in only_remote],
        "differentDDLObjects":[f"{a}/{b}" for a,b in differing],
        "recordedMigrations":entries,
        "migrationJournalExpected":journal_ok,
        "approvalToMutateData":False,
        "approvalToReconcileMigrationJournal":False,
        "approvalToPublish":False
    }

def main():
    try:
        report=assess(remote_rows(REMOTE_SQL),reference_schema(),remote_rows(JOURNAL_SQL))
        print(json.dumps(report,sort_keys=True,indent=2))
        if not report["pass"]:
            print("BLOCKED: schema differs or journal is unexpected. No modifications made.",file=sys.stderr)
            return 2
        print("PASS: exact reference DDL matches live D1. No modifications made.")
        return 0
    except Exception as exc:
        print("BLOCKED: "+str(exc),file=sys.stderr)
        return 2

if __name__=="__main__": raise SystemExit(main())
