"""Run documented exploratory comparisons without fabricating source independence."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from .external_compare import compare_external

def main():
    p=argparse.ArgumentParser(description="External clock-time research only; never publication")
    p.add_argument("--candidate",required=True,type=Path)
    p.add_argument("--references",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args()
    if args.out.exists(): raise ValueError("Refusing to overwrite scientific comparison report")
    record=json.loads(args.candidate.read_text(encoding="utf-8"))
    references=json.loads(args.references.read_text(encoding="utf-8"))
    report=compare_external(record,references)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print("PANCHAVANI EXTERNAL CLOCK-TIME RESEARCH",len(report["samples"]),"observations")
    for sample in report["samples"]:
        print(sample["source"],sample["metric"],sample["deltaSeconds"],"seconds")
    print("Source independence verified:",report["methodologicalIndependenceVerified"])
    print("Research issues:",report["issues"])
    print("Publication authorized:",report["publicationAuthorized"])

if __name__=="__main__":
    main()
