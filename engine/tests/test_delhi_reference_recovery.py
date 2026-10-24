"""Tests use fake planetary positions / batches. Never science endorsement."""
import copy,json,unittest
from datetime import datetime,timezone,timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from panchavani.delhi_reference_recovery import vet_observation,recover
from panchavani.swiss_four_limb_validation import tropical_phase,solve_tropical,compare_batch
from test_ten_city_six_limb_research import ten_city_research_batch

FIXTURE=Path(__file__).resolve().parents[1]/"fixtures"/"delhi-2026-10-21-tithi-recapture-UNAPPROVED.json"
def source():return json.loads(FIXTURE.read_text())
def synthetic():
 batch=ten_city_research_batch(datetime(2026,10,21).date())
 rec=next(x for x in batch["records"] if x["cityId"]=="delhi" and x["localDate"]=="2026-10-21")
 rec["transitions"]["tithi"]=[
  {"number":10,"name":"Dashami","startUtc":rec["sun"]["sunriseUtc"],"endUtc":"2026-10-21T08:42:00Z"},
  {"number":11,"name":"Ekadashi","startUtc":"2026-10-21T08:42:00Z","endUtc":rec["sun"]["nextSunriseUtc"]}]
 rec["transitions"]["karana"]=[
  {"number":20,"name":"Garaja","startUtc":rec["sun"]["sunriseUtc"],"endUtc":"2026-10-21T08:42:00Z"},
  {"number":21,"name":"Vanija","startUtc":"2026-10-21T08:42:00Z","endUtc":rec["sun"]["nextSunriseUtc"]}]
 return batch

class RecoveryTests(unittest.TestCase):
 def test_explicit_new_delhi_source_can_be_read_but_not_approved(self):
  evidence=vet_observation(source())
  self.assertFalse(evidence["methodConventionReconciled"])
  with patch('panchavani.delhi_reference_recovery.verify_batch',return_value={"localDateFrom":"2026-10-21"}):
   report=recover(synthetic(),evidence)
  self.assertEqual(report["cityId"],"delhi")
  self.assertEqual(report["referenceUtc"],"2026-10-21T08:41:00+00:00")
  self.assertEqual(report["signedJplMinusPublisherSeconds"],60)
  self.assertEqual(report["correctLocationPublisherEventCount"],1)
  self.assertEqual(report["originalQuarantinedReferenceCount"],5)
  self.assertFalse(report["scientificApproval"])
  self.assertFalse(report["publicationAuthorized"])
  self.assertFalse(report["indexingAuthorized"])
  self.assertEqual(report["approvedClaimsForDeepSeek"],[])
 def test_url_identity_or_fabricated_approval_rejected(self):
  for change in ("mauritius","missing-year","other-date","another-city","wrong-value","claimed-signature","extra-permit"):
   x=source()
   if change=="mauritius":x["sourceUrl"]=x["sourceUrl"].replace("1261481","934657")
   if change=="missing-year":x["sourceUrl"]=x["sourceUrl"].split("&year=")[0]
   if change=="other-date":x["localDate"]="2026-10-22"
   if change=="another-city":x["sourceDisplayedCity"]="New York, USA"
   if change=="wrong-value":x["sourceLocalTime"]="2026-10-21T14:12:00+05:30"
   if change=="claimed-signature":x["sourceReadoutIndependentlySigned"]=True
   if change=="extra-permit":x["publicationAuthorized"]=True
   with self.subTest(change=change),self.assertRaises(ValueError):vet_observation(x)
 def test_wrong_model_phase_identifier_is_rejected(self):
  b=synthetic()
  d=next(x for x in b["records"] if x["cityId"]=="delhi" and x["localDate"]=="2026-10-21")
  d["transitions"]["tithi"][0]["number"]=8
  with patch('panchavani.delhi_reference_recovery.verify_batch',return_value={"localDateFrom":"2026-10-21"}):
   with self.assertRaises(ValueError):recover(b,source())

class SwissAllFourTests(unittest.TestCase):
 class Stub:
  FLG_SWIEPH=2; FLG_MOSEPH=4; FLG_SIDEREAL=64; MOON=1; SUN=0
  SIDM_LAHIRI=1
  def julday(self,y,m,d,h):return h
  def calc_ut(self,h,body,flag):return (([12+h] if body==self.MOON else [0]),self.FLG_SWIEPH)
  def set_ephe_path(self,path):pass
  def set_sid_mode(self,*args):pass
 def test_tropical_root_and_moshier_block(self):
  swe=self.Stub()
  start=datetime(2026,10,21,tzinfo=timezone.utc)
  root=solve_tropical(swe,start,'tithi',1)
  self.assertLess(abs((root-start).total_seconds()),.13)
  self.assertAlmostEqual(tropical_phase(swe,start,'karana'),12)
  class Bad(self.Stub):
   def calc_ut(self,h,body,flag):return ([12+h],self.FLG_MOSEPH)
  with self.assertRaisesRegex(ValueError,"Moshier"):
   tropical_phase(Bad(),start,"tithi")
 def test_report_fail_closed_when_sources_or_events_incomplete(self):
  b=synthetic()
  with self.assertRaises(ValueError):
   compare_batch(b)
  with TemporaryDirectory() as tmp:
   for name in ("sepl_18.se1","semo_18.se1"):
    (Path(tmp)/name).write_bytes(b"0"*100100)
   with patch.dict('os.environ',{"PANCHAVANI_SWISS_EPHE_PATH":tmp}):
    # Synthetic 10-city source does not contain four event-layer crossings.
    with self.assertRaisesRegex(ValueError,"all 4 limbs"):
     compare_batch(b,scope='delhi',swe=self.Stub())
if __name__=="__main__":unittest.main()
