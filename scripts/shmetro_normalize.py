#!/usr/bin/env python3
"""Normalize scraped Shanghai Metro toilet data for app consumption."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path
from typing import Any


ICON_MAP = {
    "t_i.png": {
        "kind": "toilet",
        "scope": "inside",
        "label": "费区内卫生间",
        "display": True,
    },
    "w_i.png": {
        "kind": "accessible",
        "scope": "inside",
        "label": "费区内无障碍卫生间",
        "display": True,
    },
    "t_o.png": {
        "kind": "toilet",
        "scope": "outside",
        "label": "费区外卫生间",
        "display": True,
    },
    "w_o.png": {
        "kind": "accessible",
        "scope": "outside",
        "label": "费区外无障碍卫生间",
        "display": True,
    },
    "t_io.png": {
        "kind": "toilet",
        "scope": "inside_outside",
        "label": "费区内/外均有卫生间",
        "display": True,
    },
    "w_io.png": {
        "kind": "accessible",
        "scope": "inside_outside",
        "label": "费区内/外均有无障碍卫生间",
        "display": True,
    },
    "t_os.png": {
        "kind": "toilet",
        "scope": "station_outside",
        "label": "车站外卫生间",
        "display": False,
    },
    "w_os.png": {
        "kind": "accessible_absent",
        "scope": "none",
        "label": "无无障碍卫生间",
        "display": False,
    },
}

SCOPE_PRIORITY = {
    "inside": 1,
    "outside": 2,
    "inside_outside": 3,
    "station_outside": 4,
    "unknown": 5,
    "none": 6,
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def detect_scope_from_text(text: str) -> str | None:
    normalized = re.sub(r"\s+", "", text or "")
    if not normalized:
        return None
    if "车站外" in normalized:
        return "station_outside"
    if "费区内/外" in normalized or "费区内外" in normalized:
        return "inside_outside"
    if "费区内" in normalized:
        return "inside"
    if "费区外" in normalized:
        return "outside"
    return None


def icon_scope(icon_name: str | None) -> str | None:
    if not icon_name:
        return None
    icon = ICON_MAP.get(icon_name)
    if not icon:
        return None
    return icon["scope"]


def choose_primary_scope(entry: dict[str, Any]) -> str:
    description_scope = detect_scope_from_text(entry.get("description") or "")
    icon1_scope = icon_scope(entry.get("icon1"))
    if description_scope:
        return description_scope
    if icon1_scope:
        return icon1_scope
    return "unknown"


def normalize_toilet_entry(entry: dict[str, Any]) -> dict[str, Any]:
    icon1 = entry.get("icon1")
    icon2 = entry.get("icon2")
    description = (entry.get("description") or "").strip()
    primary_scope = choose_primary_scope(entry)
    icon1_meta = ICON_MAP.get(icon1, {})
    icon2_meta = ICON_MAP.get(icon2, {})

    has_toilet = icon1_meta.get("kind") == "toilet"
    has_accessible = icon2_meta.get("kind") == "accessible"
    accessible_absent = icon2_meta.get("kind") == "accessible_absent"

    displayable = primary_scope != "station_outside" and has_toilet
    legend_types = []
    if has_toilet and primary_scope in {"inside", "outside", "inside_outside"}:
        legend_types.append(f"{primary_scope}_toilet")
    if has_accessible and primary_scope in {"inside", "outside", "inside_outside"}:
        legend_types.append(f"{primary_scope}_accessible")

    return {
        "line_no": str(entry.get("line_no")) if entry.get("line_no") is not None else None,
        "description": description,
        "scope_type": primary_scope,
        "icon1": icon1,
        "icon2": icon2,
        "icon1_label": icon1_meta.get("label"),
        "icon2_label": icon2_meta.get("label"),
        "has_toilet": has_toilet,
        "has_accessible_toilet": has_accessible,
        "accessible_absent": accessible_absent,
        "displayable": displayable,
        "legend_types": legend_types,
    }


def dedupe_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    deduped = []
    for entry in entries:
        key = (
            entry.get("line_no"),
            entry.get("scope_type"),
            entry.get("description"),
            tuple(entry.get("legend_types", [])),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(entry)
    return deduped


def sort_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        entries,
        key=lambda item: (
            999 if item["line_no"] is None else int(item["line_no"]),
            SCOPE_PRIORITY.get(item["scope_type"], 99),
            item["description"],
        ),
    )


def normalize_station(station: dict[str, Any]) -> dict[str, Any]:
    normalized_entries = [
        normalize_toilet_entry(entry) for entry in station.get("toilet_entries", [])
    ]
    display_entries = [entry for entry in normalized_entries if entry["displayable"]]
    display_entries = sort_entries(dedupe_entries(display_entries))

    station_scope_types = sorted({entry["scope_type"] for entry in display_entries})
    station_legend_types = sorted(
        {legend for entry in display_entries for legend in entry["legend_types"]}
    )

    return {
        "station_id": station["station_id"],
        "station_name": station["station_name"],
        "station_code": station.get("station_code"),
        "lines": station.get("lines", []),
        "floorplan_local_path": station.get("floorplan_local_path"),
        "has_floorplan": station.get("has_floorplan", False),
        "error": station.get("error"),
        "toilet_entries_all": normalized_entries,
        "toilet_entries_display": display_entries,
        "has_display_toilet": bool(display_entries),
        "scope_types": station_scope_types,
        "legend_types": station_legend_types,
        "search_text": " ".join(
            [
                station["station_name"],
                " ".join(station.get("lines", [])),
            ]
        ).strip(),
    }


def flatten_entries(stations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for station in stations:
        for entry in station["toilet_entries_display"]:
            rows.append(
                {
                    "station_id": station["station_id"],
                    "station_name": station["station_name"],
                    "station_lines": ",".join(station["lines"]),
                    "line_no": entry["line_no"] or "",
                    "scope_type": entry["scope_type"],
                    "has_accessible_toilet": entry["has_accessible_toilet"],
                    "accessible_absent": entry["accessible_absent"],
                    "legend_types": ",".join(entry["legend_types"]),
                    "description": entry["description"],
                    "icon1": entry["icon1"] or "",
                    "icon2": entry["icon2"] or "",
                }
            )
    return rows


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    fieldnames = list(rows[0].keys())
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def normalize(input_path: Path, output_root: Path) -> None:
    raw_stations = load_json(input_path)
    normalized_stations = [normalize_station(station) for station in raw_stations]
    flattened_rows = flatten_entries(normalized_stations)

    summary = {
        "raw_station_count": len(raw_stations),
        "normalized_station_count": len(normalized_stations),
        "stations_with_display_toilet": sum(
            1 for station in normalized_stations if station["has_display_toilet"]
        ),
        "display_entry_count": len(flattened_rows),
        "filtered_station_outside_entry_count": sum(
            1
            for station in normalized_stations
            for entry in station["toilet_entries_all"]
            if entry["scope_type"] == "station_outside"
        ),
        "stations_with_errors": sum(1 for station in normalized_stations if station["error"]),
    }

    write_json(output_root / "stations.normalized.json", normalized_stations)
    write_json(output_root / "icon_legend.json", ICON_MAP)
    write_json(output_root / "summary.normalized.json", summary)
    write_csv(output_root / "toilet_entries.normalized.csv", flattened_rows)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Normalize scraped Shanghai Metro toilet data for the app."
    )
    parser.add_argument(
        "--input",
        default="output/shmetro/stations.json",
        help="Raw station JSON generated by shmetro_scrape.py",
    )
    parser.add_argument(
        "--output-root",
        default="output/shmetro/normalized",
        help="Directory for normalized outputs",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    try:
        normalize(Path(args.input), Path(args.output_root))
    except Exception as exc:  # pragma: no cover
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
