"""Seven-day DELHI public research preview — controlled, noindex, no model calls.

Converts precisely the 2026-10-27..2026-11-02 JPL 3-city research cohort
to a visible but NEVER VERIFIED nor INDEXABLE educational test. A selected
publication date reveals only earlier/current days. Not connected to the
separately signed publication manifest or DeepSeek approval system.
"""
from __future__ import annotations
import argparse,hashlib,json
from datetime import date
from pathlib import Path

from .seven_day_science_pilot import validate_week
START=date(2026,10,27)
END=date(2026,11,2)
MODEL="UNAPPROVED_PUBLIC_RESEARCH_PILOT"
# Independently written editorial reading angles, never festival or Muhurat advice.
ANGLES=[
 ("Understanding the sunrise baseline",
  "Today's research begins with the local sunrise rather than with midnight. That distinction is central to a city-specific Panchang: the Sun crosses the observer's horizon at a time governed by longitude, latitude and the adopted atmosphere model. The lunar component active at that instant is a snapshot, not an assertion that the component lasts all day.",
  "Watch the next event in each phase timeline rather than assuming every heading changes at the same time. The geocentric Sun and Moon calculations describe one sequence of transition instants, whereas the Delhi sunrise determines which interval is sampled in the daily entry. This page intentionally keeps those two concepts separate.",
  "How to read this research: compare the sunrise and the next phase ending, then check the model and its limitations. Do not infer fasting dates or auspicious moments from an unreviewed component."),
 ("Reading Tithi alongside Karana",
  "Tithi follows successive twelve-degree intervals in the geocentric angular separation between the Moon and the Sun. Karana tracks six-degree halves of that same cycle. They are related quantities, not two unrelated astrological labels. Their boundaries should agree when the same angular threshold is reached.",
  "A change of Tithi may occur after the city's sunrise, in the afternoon, at night or near the next sunrise. The local date printed at the top is only a way of locating the interval in a civil calendar. Our research chronology preserves the UTC event boundaries, then formats them in Indian Standard Time for reading.",
  "When comparing two calendars, check that they refer to the same ending number and the same UTC instant before comparing their printed wall-clock values. A comparison made on mismatched boundaries can produce a false discrepancy."),
 ("Why lunar mansions are sidereal",
  "A Nakshatra is a segment of the sidereal lunar path. The astronomical calculation uses the Moon's sidereal longitude, which requires a stated ayanamsa convention. Merely selecting a popular label for Lahiri does not prove that two implementations agree near a boundary.",
  "This preview uses a provisional sidereal calculation tied to a pinned JPL kernel. It is suitable for testing event sequencing and page presentation, but it does not establish the adopted sidereal convention as independently certified. Around sector edges, a small angular difference can shift the displayed transition time.",
  "For responsible interpretation, separate the number shown at sunrise from the event that ends that segment later. These are different questions, and the correct answer depends on the precise instant being examined."),
 ("Following the yoga transition",
  "Yoga in a Panchang is derived from an angular combination of the Sun and Moon under a sidereal convention. It is distinct from exercise or physical postures, and its changing label does not by itself justify advice about an event, business decision or ceremony.",
  "Today the component timeline is presented as a continuous sequence between one local sunrise and the next. A rigorous timeline must account for every interval and may not invent a change where none occurred. Continuity across neighbouring days is an important numerical invariant in our research quality checks.",
  "If you want to compare the result with another publisher, begin by confirming the ayanamsa, reference frame and event-clock definition. The same name appearing in two tables is weaker evidence than agreement of their calculated boundary instants."),
 ("What city coordinates change",
  "Latitude and longitude matter for the observed rise and setting of the Sun. The elevation of the reference point, the horizon assumption and atmospheric refraction can also influence the printed clock. A city label alone does not specify every variable needed for reproducibility.",
  "By contrast, a geocentric lunar longitude transition represents the same physical event regardless of the Indian city chosen for display. The local sunrise samples that global sequence at a different instant. This is how two correct city calendars might disagree about the lunar label at sunrise while agreeing about its UTC end time.",
  "The coordinates in this release remain estimated research reference values. No one should treat the displayed clock as a certified observation at their home or a particular temple location."),
 ("How to evaluate a Panchang discrepancy",
  "An apparent disagreement may be caused by rounding, a different observing location, a date conversion or a genuinely different astronomical method. It is important not to collapse these possibilities into a single accusation of error. Reference publishers sometimes print sunrise-reckoned clock hours beyond twenty-four, which refer to an instant on the next civil date.",
  "Our quality process keeps source timestamps and event numbers rather than relying on matching labels alone. Independent Swiss comparisons are performed in a separate research workflow; those analytical results are not equivalent to a signed professional review of every future date.",
  "When reading any daily page, look for its calculation method and source limitations. The absence of a qualified review is a real status, and should be disclosed rather than hidden behind apparent numerical precision."),
 ("Completing the seven-day research cycle",
  "The final preview in this trial connects the daily entry to a longer sequence. A calendar consists of contiguous intervals. The ending of a lunar component on one day must join correctly to the beginning of the next, and each sunrise must lead forward to the following local sunrise without gaps.",
  "A seven-day pilot can test reproducibility, chronology, content structure and whether dates contain distinct calculated changes. It cannot, by itself, validate festival traditions, local observances or every future boundary. Those questions need their own evidence and appropriate review before a more authoritative publication.",
  "The useful outcome of this trial is a transparent public research interface, plus an evidence report telling us what agreed, what differed and what remains uncertain. It is not a licence to publish thousands of unreviewed calendar recommendations.")
]
assert len(ANGLES)==7

def digest(raw:bytes):return hashlib.sha256(raw).hexdigest()
def generate(research:dict,until:date)->dict:
 if research.get("artifactType")!="PANCHAVANI_THREE_CITY_SEVEN_DAY_INDEPENDENT_RECOMPUTATION_RESEARCH" or research.get("scientificApproval") is not False or research.get("publicationAuthorized") is not False or research.get("modelInvocationAuthorized") is not False:
    raise ValueError("Cannot use anything but unapproved research-only JPL source")
 dates=research.get("localDates")
 if dates!=[(START.fromordinal(START.toordinal()+i)).isoformat() for i in range(7)]:
    raise ValueError("Seven-day research must match the exact opt-in pilot dates")
 validated=validate_week(research["records"],START)
 if validated.get("internallyConsistent") is not True:
    raise ValueError("Science chronology was not internally checked")
 if until<START: selected=[]
 else:
    if until>END:until=END
    selected=[d for d in dates if d<=until.isoformat()]
 rows={p["localDate"]:p for p in research["records"] if p["cityId"]=="delhi"}
 if len(rows)!=7:raise ValueError("Missing Delhi cohort")
 output=[]
 for day in selected:
    p=rows[day]
    if p["scientificApproval"] is not False or p["indexingAuthorized"] is not False or p["ritualInterpretationApproved"] is not False:
        raise ValueError("Unexpected approval in source record")
    index=dates.index(day)
    layers=p["transitions"]
    for kind in ("tithi","karana","nakshatra","yoga"):
        if not isinstance(layers.get(kind),list) or not layers[kind]:
            raise ValueError("Missing researched lunar timeline")
    narrative=ANGLES[index]
    source_identity=json.dumps(p,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
    output.append({
      "cityId":"delhi","cityName":"Delhi","date":day,
      "status":MODEL,"titleAngle":narrative[0],
      "editorialParagraphs":list(narrative[1:]),
      "researchSourceRecordSha256":digest(source_identity),
      "sourceKernelSha256":research["ephemerisSha256"],
      "solarModel":p["methodology"]["sunriseModel"],
      "siderealModel":p["methodology"]["provisionalSiderealModel"],
      "cityReference":p["cityReference"],
      "sun":p["sun"],"panchang":p["panchangAtSunrise"],
      "transitions":layers,
      "verifiedByIndependentScientist":False,
      "recommendedForRitualDecisions":False,
      "modelNarrativeGenerated":False,
      "humanEditorialApproved":False,
      "indexingAuthorized":False
    })
 if len(output)!=len(selected):raise ValueError("Invalid released day count")
 return {"artifactType":"PANCHAVANI_7DAY_NO_INDEX_PUBLIC_RESEARCH_PREVIEW",
   "schemaVersion":1,"status":MODEL,"cityId":"delhi",
   "scopeStart":START.isoformat(),"scopeEnd":END.isoformat(),
   "visibleThrough":selected[-1] if selected else None,
   "sourceType":"RECOMPUTED_JPL_RESEARCH_NOT_ORIGINAL_D1_R2",
   "sourceKernelSha256":research["ephemerisSha256"],
   "sourceApproval":False,"humanEditorialApproved":False,
   "deepSeekInvocationAuthorized":False,
   "publicationAsVerifiedPanchangAuthorized":False,
   "searchIndexingAuthorized":False,"days":output}

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--source",type=Path,required=True)
 p.add_argument("--through",type=date.fromisoformat,required=True)
 p.add_argument("--out",type=Path,required=True)
 a=p.parse_args()
 if a.source.resolve()==a.out.resolve():raise ValueError("Do not overwrite calculation source")
 research=json.loads(a.source.read_text(encoding="utf-8"))
 result=generate(research,a.through)
 a.out.parent.mkdir(parents=True,exist_ok=True)
 a.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"PUBLIC NOINDEX RESEARCH: {len(result['days'])} / 7 Delhi days visible")
 print("SCIENTIFIC AUTHORITY: NONE; DEEPSEEK: NO; GOOGLE INDEXING: NO")
if __name__=="__main__":main()
