"""Synthetic-only 7-day publication safety and originality tests; no real approvals."""
import copy,unittest
from datetime import date,timedelta
from unittest.mock import patch
from panchavani.public_research_pilot import generate,START,END,ANGLES

DAYS=[START+timedelta(days=i) for i in range(7)]
def specimen():
 recs=[]
 for d in DAYS:
  for city in ("delhi","mumbai","chennai"):
   day=d.isoformat()
   recs.append({"cityId":city,"localDate":day,
      "scientificApproval":False,"indexingAuthorized":False,
      "ritualInterpretationApproved":False,
      "methodology":{"sunriseModel":"SYNTHETIC_HORIZON","provisionalSiderealModel":"SYNTHETIC_SIDEREAL"},
      "cityReference":{"latitude":1.5,"longitude":1.5,"estimatedElevationMeters":10,
         "coordinatesVerified":False,"elevationVerified":False,"horizonConventionValidated":False},
      "sun":{"sunriseUtc":day+"T00:30:00Z","sunsetUtc":day+"T12:00:00Z",
           "nextSunriseUtc":(d+timedelta(days=1)).isoformat()+"T00:30:00Z"},
      "panchangAtSunrise":{"tithi":"Shukla Navami","nakshatra":"Shravana","yoga":"Shula",
         "karana":"Kaulava","vara":"Tuesday","paksha":"Shukla"},
      "transitions":{kind:[{"number":1,"name":name,"startUtc":day+"T00:30:00Z",
       "endUtc":(d+timedelta(days=1)).isoformat()+"T00:30:00Z"}] for kind,name in
       (("tithi","Shukla Navami"),("karana","Kaulava"),("nakshatra","Shravana"),("yoga","Shula"))}
    })
 return {"artifactType":"PANCHAVANI_THREE_CITY_SEVEN_DAY_INDEPENDENT_RECOMPUTATION_RESEARCH",
   "scientificApproval":False,"publicationAuthorized":False,"modelInvocationAuthorized":False,
   "localDates":[x.isoformat() for x in DAYS],"ephemerisSha256":"c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2",
   "records":recs}

class PreviewRelease(unittest.TestCase):
 def mk(self,day):
  with patch('panchavani.public_research_pilot.validate_week',return_value={"internallyConsistent":True}):
   return generate(specimen(),day)
 def test_one_issued_each_day_and_all_seven_are_unique(self):
  for n,day in enumerate(DAYS):
   r=self.mk(day)
   self.assertEqual(len(r["days"]),n+1)
   self.assertEqual(r["visibleThrough"],day.isoformat())
   self.assertFalse(r["searchIndexingAuthorized"])
   self.assertFalse(r["deepSeekInvocationAuthorized"])
   self.assertFalse(r["sourceApproval"])
   self.assertTrue(all(not d["verifiedByIndependentScientist"] and
      not d["indexingAuthorized"] and not d["humanEditorialApproved"] for d in r["days"]))
  all_=self.mk(END)["days"]
  self.assertEqual(len({r["titleAngle"] for r in all_}),7)
  self.assertEqual(len({r["researchSourceRecordSha256"] for r in all_}),7)
 def test_future_pages_are_never_previously_released(self):
  self.assertEqual(self.mk(START-timedelta(days=1))["days"],[])
  self.assertEqual(len(self.mk(END+timedelta(days=1))["days"]),7)
 def test_hmac_science_approval_cannot_enter_preview(self):
  data=specimen();data["scientificApproval"]=True
  with patch('panchavani.public_research_pilot.validate_week',return_value={"internallyConsistent":True}):
   with self.assertRaises(ValueError):generate(data,START)
 def test_source_record_claims_cannot_be_signed(self):
  data=specimen()
  next(r for r in data["records"] if r["cityId"]=="delhi")["scientificApproval"]=True
  with patch('panchavani.public_research_pilot.validate_week',return_value={"internallyConsistent":True}):
   with self.assertRaises(ValueError):generate(data,START)
 def test_every_article_has_substantial_distinct_reader_education(self):
  self.assertEqual(len(ANGLES),7)
  paragraphs=[' '.join(x[1:]).lower() for x in ANGLES]
  self.assertTrue(all(len(s.split())>=95 for s in paragraphs))
  def shingles(x):
   toks=x.split()
   return set(zip(toks,toks[1:],toks[2:]))
  for i in range(7):
   for j in range(i+1,7):
    a,b=shingles(paragraphs[i]),shingles(paragraphs[j])
    similarity=len(a&b)/max(1,len(a|b))
    self.assertLess(similarity,.22,(i,j,similarity))
if __name__=="__main__":unittest.main()
