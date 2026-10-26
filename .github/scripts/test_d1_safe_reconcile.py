import importlib.util,sys
from pathlib import Path
import unittest

sys.path.insert(0,str(Path(__file__).parent))
spec=importlib.util.spec_from_file_location(
    "d1_safe_reconcile",Path(__file__).with_name("d1_safe_reconcile.py"))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class RepairTests(unittest.TestCase):
 def setUp(self):
  self.baseline=m.audit.reference_schema()
  self.first=[{"name":m.NAMES[0]}]
 def test_only_known_index_missing(self):
  without=[x for x in self.baseline if x["name"]!="idx_private_handoff_state"]
  self.assertEqual(m.choose_repair(without,self.baseline,self.first)[0],"add-index-and-ledger")
 def test_after_index_repaired(self):
  self.assertEqual(m.choose_repair(self.baseline,self.baseline,self.first)[0],"ledger-only")
 def test_idempotent_completed_state(self):
  done=[{"name":n} for n in m.NAMES]
  self.assertEqual(m.choose_repair(self.baseline,self.baseline,done)[0],"done")
 def test_unrecognized_schema_object_blocks(self):
  other=self.baseline+[{"type":"table","name":"new_table","tbl_name":"new_table","sql":"CREATE TABLE new_table(x)"}]
  self.assertEqual(m.choose_repair(other,self.baseline,self.first)[0],"blocked-ddl")
 def test_changed_constraint_blocks(self):
  altered=[dict(r) for r in self.baseline]
  for item in altered:
   if item["name"]=="job_requests":item["sql"]=item["sql"].replace("'queued'","'changed'")
  self.assertEqual(m.choose_repair(altered,self.baseline,self.first)[0],"blocked-ddl")
 def test_other_missing_index_is_not_repairable(self):
  other=[x for x in self.baseline if x["name"]!="idx_auto_import_created"]
  self.assertEqual(m.choose_repair(other,self.baseline,self.first)[0],"blocked-schema")
 def test_unrecognized_journal_blocks(self):
  self.assertEqual(m.choose_repair(self.baseline,self.baseline,[{"name":"bogus"}])[0],"blocked-journal")
 def test_actual_journal_column_signature(self):
  c=[{"name":"id","type":"INTEGER","pk":1,"dflt_value":None},
     {"name":"name","type":"TEXT","pk":0,"dflt_value":None},
     {"name":"applied_at","type":"TIMESTAMP","pk":0,"dflt_value":"CURRENT_TIMESTAMP"}]
  self.assertTrue(m.checked_journal_columns(c))
  c[2]["dflt_value"]=None
  self.assertFalse(m.checked_journal_columns(c))
 def test_allowlisted_sql_matches_0005_migration(self):
  c=(m.audit.MIGRATIONS/m.audit.NAMES[4]).read_text()
  self.assertIn("idx_private_handoff_state",c)
  self.assertIn("ON private_research_handoff_slots(status,created_at)",m.INDEX_SQL)
 def test_journal_metadata_does_not_mark_0007(self):
  self.assertNotIn("0007",m.journal_insert())
  self.assertEqual(m.journal_insert().count("000"),5)
if __name__=="__main__":unittest.main()
