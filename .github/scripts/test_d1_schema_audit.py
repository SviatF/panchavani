import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location(
 "d1_audit",Path(__file__).with_name("d1_schema_audit.py"))
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class SchemaTests(unittest.TestCase):
 def test_replay_reference_files_in_memory(self):
  rows=mod.reference_schema()
  names={x["name"] for x in rows}
  for table in ["job_requests","runner_nonces","research_candidates",
                "autonomous_research_slots","autonomous_ai_slots",
                "editorial_one_shot","private_research_handoff_slots",
                "automated_research_import_slots"]:
   self.assertIn(table,names)
  self.assertNotIn("editorial_multi_intent_once",names)
 def test_exact_schema_and_single_journal(self):
  reference=mod.reference_schema()
  state=mod.assess(reference,reference,[{"name":mod.NAMES[0]}])
  self.assertTrue(state["pass"])
  self.assertFalse(state["approvalToReconcileMigrationJournal"])
 def test_unexpected_journal_blocks(self):
  reference=mod.reference_schema()
  self.assertFalse(mod.assess(reference,reference,
   [{"name":"wrong.sql"}])["pass"])
 def test_constraint_or_ddl_change_blocks(self):
  reference=mod.reference_schema()
  remote=[dict(x) for x in reference]
  t=next(x for x in remote if x["name"]=="job_requests")
  t["sql"]=t["sql"].replace("'queued'","'running'")
  state=mod.assess(remote,reference,[{"name":mod.NAMES[0]}])
  self.assertFalse(state["pass"])
  self.assertIn("table/job_requests",state["differentDDLObjects"])
 def test_missing_index_blocks(self):
  reference=mod.reference_schema()
  remote=[x for x in reference if x["name"]!="idx_auto_import_created"]
  self.assertFalse(mod.assess(remote,reference,[{"name":mod.NAMES[0]}])["pass"])
 def test_unexpected_table_blocks(self):
  reference=mod.reference_schema()
  remote=reference+[{"type":"table","name":"other","tbl_name":"other","sql":"CREATE TABLE other(a)"}]
  self.assertFalse(mod.assess(remote,reference,[{"name":mod.NAMES[0]}])["pass"])

if __name__=="__main__":unittest.main()
