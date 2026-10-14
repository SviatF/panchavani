import io
import json
import tempfile
import unittest
import zipfile
from types import SimpleNamespace
from panchavani.geodata_audit import (
    km_between, geodata_research_report, candidates_for_cities,
)

def fake_row(id, name, lat, lon, *, country="IN", fclass="P", alternate="", population=1200, dem=None, elevation=None):
    cols=[str(id),name,name,alternate,str(lat),str(lon),fclass,"PPLA",
          country,"","36","","","",str(population),
          str(elevation) if elevation is not None else "",
          str(dem) if dem is not None else "",
          "Asia/Kolkata","2026-10-14"]
    return "\t".join(cols)+"\n"

def archive_with(rows):
    buf=io.BytesIO()
    with zipfile.ZipFile(buf,"w") as z:z.writestr("IN.txt","".join(rows))
    return buf.getvalue()

class GeoNamesAuditTests(unittest.TestCase):
 def test_audit_finds_india_populated_place_not_admin_or_wrong_country(self):
    india=fake_row(1261481,"New Delhi",28.6139,77.209,alternate="Delhi",population=250000)
    wrong=fake_row(9000,"Delhi",28.6139,77.209,country="US",population=50000)
    administrative=fake_row(8000,"Delhi",28.61,77.21,fclass="A")
    city=SimpleNamespace(name="Delhi",latitude=28.6139,longitude=77.209,elevation_m=216)
    result=geodata_research_report(archive_with([wrong,administrative,india]),{"delhi":city})
    self.assertEqual(result["researchCityCount"],1)
    self.assertEqual(result["nearestGazetteerMatchCount"],1)
    self.assertEqual(result["records"][0]["nearestCandidate"]["geonameId"],1261481)
    self.assertFalse(result["publicIndexingAuthorized"])
    self.assertEqual(result["cityCoordinatesVerifiedCount"],0)
 def test_not_matching_unrelated_population_centres(self):
    q=fake_row(501,"Mumbai",20.5,75.0)
    city=SimpleNamespace(name="Mumbai",latitude=19.076,longitude=72.8777,elevation_m=14)
    r=geodata_research_report(archive_with([q]),{"mumbai":city})
    self.assertEqual(r["nearestGazetteerMatchCount"],0)
    self.assertIn("mumbai",r["needsDistanceOrMissingMatchReview"])
 def test_alias_helps_rename_but_not_fake_coordinate(self):
    city=SimpleNamespace(name="Prayagraj",latitude=25.44478,longitude=81.843217,elevation_m=98)
    record=fake_row(987,"Allahabad",25.445,81.844)
    r=geodata_research_report(archive_with([record]),{"prayagraj":city})
    self.assertEqual(r["nearestGazetteerMatchCount"],1)
    self.assertFalse(r["records"][0]["readyForPanchangPublication"])
 def test_dem_difference_flags_are_not_observatory_certifications(self):
    city=SimpleNamespace(name="Ujjain",latitude=23.1765,longitude=75.7885,elevation_m=494)
    result=geodata_research_report(
        archive_with([fake_row(999,"Ujjain",23.1765,75.7885,dem=200)]),{"ujjain":city})
    self.assertEqual(result["gazetteerDemAvailableCount"],1)
    self.assertEqual(result["elevationDiffOver100mOrMissingDem"],["ujjain"])
    self.assertEqual(result["records"][0]["researchVsGazetteerDemDeltaMeters"],294)
    self.assertFalse(result["records"][0]["stationElevationVerified"])
    good=geodata_research_report(
        archive_with([fake_row(999,"Ujjain",23.1765,75.7885,dem=495)]),{"ujjain":city})
    self.assertEqual(good["elevationDiffOver100mOrMissingDem"],[])
    self.assertFalse(good["records"][0]["readyForPanchangPublication"])

 def test_invalid_archives_fail_instead_of_guessing(self):
    with self.assertRaises(ValueError):
        geodata_research_report(b"not zip")
    buf=io.BytesIO()
    with zipfile.ZipFile(buf,"w") as z:z.writestr("OTHER.txt","data")
    with self.assertRaises(ValueError):
        geodata_research_report(buf.getvalue())
 def test_distances(self):
    self.assertLess(km_between(28.6139,77.209,28.6140,77.2091),.05)
    self.assertGreater(km_between(28.6139,77.209,19.076,72.8777),1000)

if __name__=="__main__":
 unittest.main()
