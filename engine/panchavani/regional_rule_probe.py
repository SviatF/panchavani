"""Evaluate a researched regional predicate on a real candidate; never propose a festival."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from .regional_rules import evaluate_local_predicate

def main():
    p=argparse.ArgumentParser(description="Dry-run a regional predicate, NEVER publish")
    p.add_argument("--candidate",required=True,type=Path)
    p.add_argument("--rulepack",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args()
    if args.out.exists():raise ValueError("Refusing to overwrite regional research evidence")
    candidate=json.loads(args.candidate.read_text(encoding="utf-8"))
    pack=json.loads(args.rulepack.read_text(encoding="utf-8"))
    report=evaluate_local_predicate(candidate,pack)
    if report["publicationAuthorized"] or report["observanceDetermined"] or (
        report["muhuratRecommended"] or report["indexingAuthorized"] or
        not report["blockingReasons"]
    ):
        raise ValueError("Region-specific research attempted to bypass release gate")
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print("City",report["cityId"],"date",report["localDate"])
    print("Astronomical predicate matched",report["researchPredicateMet"])
    print("Festivals/Muhurat determined",report["observanceDetermined"])
    print("Release and indexing authorized",report["publicationAuthorized"],report["indexingAuthorized"])
    print("Blockers",report["blockingReasons"])

if __name__=="__main__":
    main()
