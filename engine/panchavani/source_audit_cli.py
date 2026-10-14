"""Audit the existing public clock-time fixtures for missing independent provenance."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from .source_audit import audit_reference_evidence

def main():
    p=argparse.ArgumentParser(description="Evidence-source audit; never a release approval")
    p.add_argument("--reference",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    if a.out.exists():raise ValueError("Review report already exists")
    fixture=json.loads(a.reference.read_text())
    result=audit_reference_evidence(fixture)
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(result,indent=2,sort_keys=True)+"\n")
    print("Reference sites:",result['sourcesSeen'])
    print("Missing documentary evidence:",result['sourceDocumentationIssues'])
    print("Source independence verified:",result['methodologicalIndependenceVerified'])
    print("Publishing permitted:",result['publicationAuthorized'])
if __name__=='__main__':main()
