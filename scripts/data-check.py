#!/usr/bin/env python3
# Standalone validator for the output of build-web-data.py (papers.json).
# Run: python3 scripts/data-check.py
#
# Checks the structural format and invariants of the generated snapshot:
# field types, unique ids, no dangling ids in resolved relations,
# citedBy == referencedBy length, and stats tables cross-checked against
# the actual papers. External codename arrays (*External) are shape-checked
# only — not resolving to a paper id is their documented purpose.

import json
import sys

from pathlib import Path

PAPERS_JSON = Path(__file__).resolve().parent.parent / "src" / "lib" / "generated" / "papers.json"

RESOLVED_RELATION_KEYS = (
    "references",
    "referencedBy",
    "basedOn",
    "basedBy",
    "comparedWith",
    "comparedBy",
)


def is_plain_int(value):
    # bool is a subclass of int in Python — exclude it explicitly.
    return isinstance(value, int) and not isinstance(value, bool)


def check_string_array(paper_id, key, value):
    assert isinstance(value, list), f"{paper_id}: relations.{key} is not an array"
    for v in value:
        assert isinstance(v, str), f"{paper_id}: relations.{key} contains a non-string"
    return value


def main():
    with PAPERS_JSON.open() as f:
        data = json.load(f)

    papers = data["papers"]
    assert len(papers) > 0, "dataset is empty"
    assert data["totalPapers"] == len(papers), "totalPapers mismatch"

    by_id = {}
    for paper in papers:
        pid = paper["id"]
        assert pid not in by_id, f"duplicate paper id {pid}"
        by_id[pid] = paper

    category_counts = {}
    tag_counts = {}
    venue_counts = {}
    year_counts = {}

    for paper in papers:
        pid = paper["id"]
        assert isinstance(pid, str), f"{pid}: id is not a string"
        assert isinstance(paper["title"], str), f"{pid}: title is not a string"
        assert is_plain_int(paper["year"]), f"{pid}: year is not a number"
        assert is_plain_int(paper["citedBy"]), f"{pid}: citedBy is not a number"
        assert paper["alias"] is None or isinstance(paper["alias"], str), f"{pid}: bad alias"
        assert paper["venue"] is None or isinstance(paper["venue"], str), f"{pid}: bad venue"
        assert paper["bib"] is None or isinstance(paper["bib"], str), f"{pid}: bad bib"
        assert isinstance(paper["links"]["further"], list), f"{pid}: links.further is not an array"

        for key in RESOLVED_RELATION_KEYS:
            targets = check_string_array(pid, key, paper["relations"][key])
            for target in targets:
                assert target in by_id, f"{pid}: dangling {key} target {target}"
        check_string_array(pid, "basedOnExternal", paper["relations"]["basedOnExternal"])
        check_string_array(pid, "comparedWithExternal", paper["relations"]["comparedWithExternal"])
        assert paper["citedBy"] == len(paper["relations"]["referencedBy"]), (
            f"{pid}: citedBy mismatch"
        )

        for category in paper["categories"]:
            category_counts[category] = category_counts.get(category, 0) + 1
        for tag in paper["tags"]:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
        if paper["venue"]:
            venue_counts[paper["venue"]] = venue_counts.get(paper["venue"], 0) + 1
        year = str(paper["year"])
        year_counts[year] = year_counts.get(year, 0) + 1

    assert data["stats"]["categories"] == category_counts, "stats.categories mismatch"
    assert data["stats"]["tags"] == tag_counts, "stats.tags mismatch"
    assert data["stats"]["venues"] == venue_counts, "stats.venues mismatch"
    assert data["stats"]["years"] == year_counts, "stats.years mismatch"

    print(f"data check passed ({len(papers)} papers)")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        sys.exit(f"data check failed: {e}")
