#!/usr/bin/env python3
"""Prepare frontend-ready Shanghai Metro toilet datasets."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any


LINE_LABELS = {
    "1": "1号线",
    "2": "2号线",
    "3": "3号线",
    "4": "4号线",
    "5": "5号线",
    "6": "6号线",
    "7": "7号线",
    "8": "8号线",
    "9": "9号线",
    "10": "10号线",
    "11": "11号线",
    "12": "12号线",
    "13": "13号线",
    "14": "14号线",
    "15": "15号线",
    "16": "16号线",
    "17": "17号线",
    "18": "18号线",
    "41": "浦江线",
    "51": "市域机场线",
    "cf": "磁浮线",
    "cxf": "磁浮线",
    "jstl": "金山铁路",
}

LINE_SORT_WEIGHT = {
    **{str(i): i for i in range(1, 19)},
    "41": 41,
    "51": 51,
    "cf": 90,
    "cxf": 90,
    "jstl": 91,
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def line_sort_key(line_no: str) -> tuple[int, str]:
    return (LINE_SORT_WEIGHT.get(str(line_no), 999), str(line_no))


def line_label(line_no: str) -> str:
    return LINE_LABELS.get(str(line_no), f"{line_no}号线")


def derive_primary_line_from_station_id(station_id: str) -> str | None:
    if not station_id:
        return None
    if station_id.startswith("41"):
        return "41"
    if station_id.startswith("51"):
        return "51"
    if station_id[:2].isdigit():
        return str(int(station_id[:2]))
    return None


def merge_station_entities(stations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for station in stations:
        key = station["station_name"]
        target = grouped.get(key)
        if target is None:
            grouped[key] = {
                "entity_id": station["station_id"],
                "station_name": station["station_name"],
                "station_codes": [station.get("station_code")] if station.get("station_code") else [],
                "raw_station_ids": [station["station_id"]],
                "raw_records": [
                    {
                        "station_id": station["station_id"],
                        "lines": list(station.get("lines", [])),
                    }
                ],
                "lines": list(station.get("lines", [])),
                "floorplan_local_path": station.get("floorplan_local_path"),
                "has_floorplan": station.get("has_floorplan", False),
                "error_messages": [station["error"]] if station.get("error") else [],
                "toilet_entries_display": list(station.get("toilet_entries_display", [])),
                "scope_types": list(station.get("scope_types", [])),
                "legend_types": list(station.get("legend_types", [])),
                "has_display_toilet": station.get("has_display_toilet", False),
            }
            continue

        target["raw_station_ids"].append(station["station_id"])
        target["raw_records"].append(
            {
                "station_id": station["station_id"],
                "lines": list(station.get("lines", [])),
            }
        )
        target["lines"] = sorted(
            set(target["lines"]) | set(station.get("lines", [])),
            key=line_sort_key,
        )
        if station.get("station_code"):
            target["station_codes"] = sorted(
                set(target["station_codes"]) | {station["station_code"]}
            )
        if station.get("error"):
            target["error_messages"] = sorted(
                set(target["error_messages"]) | {station["error"]}
            )
        if not target["has_floorplan"] and station.get("has_floorplan"):
            target["has_floorplan"] = True
            target["floorplan_local_path"] = station.get("floorplan_local_path")
        target["toilet_entries_display"].extend(station.get("toilet_entries_display", []))
        target["scope_types"] = sorted(
            set(target["scope_types"]) | set(station.get("scope_types", []))
        )
        target["legend_types"] = sorted(
            set(target["legend_types"]) | set(station.get("legend_types", []))
        )
        target["has_display_toilet"] = target["has_display_toilet"] or station.get(
            "has_display_toilet", False
        )

    return sorted(grouped.values(), key=lambda item: item["station_name"])


def build_station_detail(station: dict[str, Any]) -> dict[str, Any]:
    grouped_by_line: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in station.get("toilet_entries_display", []):
        line_no = entry.get("line_no") or "unknown"
        grouped_by_line[line_no].append(
            {
                "scope_type": entry["scope_type"],
                "description": entry["description"],
                "legend_types": entry["legend_types"],
                "has_accessible_toilet": entry["has_accessible_toilet"],
                "accessible_absent": entry["accessible_absent"],
                "icon1": entry["icon1"],
                "icon2": entry["icon2"],
            }
        )

    line_groups = []
    for line_no in sorted(grouped_by_line, key=line_sort_key):
        seen_entries = set()
        deduped_entries = []
        for entry in grouped_by_line[line_no]:
            key = (
                entry["scope_type"],
                entry["description"],
                tuple(entry["legend_types"]),
            )
            if key in seen_entries:
                continue
            seen_entries.add(key)
            deduped_entries.append(entry)
        line_groups.append(
            {
                "line_no": line_no,
                "line_label": line_label(line_no),
                "entries": deduped_entries,
            }
        )

    return {
        "station_id": station["entity_id"],
        "station_name": station["station_name"],
        "station_codes": station.get("station_codes", []),
        "raw_station_ids": station.get("raw_station_ids", []),
        "lines": station["lines"],
        "line_labels": [line_label(line_no) for line_no in sorted(station["lines"], key=line_sort_key)],
        "floorplan_local_path": station.get("floorplan_local_path"),
        "floorplan_url": (
            f"https://service.shmetro.com/skin/zct/{station['entity_id']}.jpg"
            if station.get("has_floorplan")
            else ""
        ),
        "has_floorplan": station.get("has_floorplan", False),
        "has_display_toilet": station.get("has_display_toilet", False),
        "legend_types": station.get("legend_types", []),
        "scope_types": station.get("scope_types", []),
        "error_messages": station.get("error_messages", []),
        "toilet_line_groups": line_groups,
    }


def build_station_list_item(station: dict[str, Any], line_no: str | None = None) -> dict[str, Any]:
    all_lines = sorted(station["lines"], key=line_sort_key)
    return {
        "station_id": station["station_id"],
        "station_name": station["station_name"],
        "line_no": line_no,
        "line_label": line_label(line_no) if line_no else None,
        "station_line_labels": [line_label(item) for item in all_lines],
        "legend_types": station["legend_types"],
        "scope_types": station["scope_types"],
        "has_floorplan": station["has_floorplan"],
    }


def build_browse_data(stations: list[dict[str, Any]]) -> dict[str, Any]:
    display_stations = [station for station in stations if station["has_display_toilet"]]
    all_items = [
        build_station_list_item(station)
        for station in sorted(display_stations, key=lambda item: item["station_name"])
    ]

    by_line: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for station in display_stations:
        for line_no in sorted(station["lines"], key=line_sort_key):
            by_line[line_no].append(build_station_list_item(station, line_no=line_no))

    line_sections = []
    for line_no in sorted(by_line, key=line_sort_key):
        line_sections.append(
            {
                "line_no": line_no,
                "line_label": line_label(line_no),
                "stations": sorted(by_line[line_no], key=lambda item: item["station_name"]),
            }
        )

    return {
        "all": all_items,
        "lines": line_sections,
    }


def build_route_search_index(stations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items = []
    dedup = set()
    for station in stations:
        for raw_record in station.get("raw_records", []):
            raw_station_id = raw_record["station_id"]
            line_no = derive_primary_line_from_station_id(raw_station_id)
            if not line_no:
                continue
            dedup_key = (raw_station_id, line_no)
            if dedup_key in dedup:
                continue
            dedup.add(dedup_key)
            items.append(
                {
                    "search_type": "route_station",
                    "station_id": raw_station_id,
                    "station_entity_id": station["entity_id"],
                    "station_name": station["station_name"],
                    "line_no": line_no,
                    "line_label": line_label(line_no),
                    "display_name": f"{line_label(line_no)} · {station['station_name']}",
                    "keywords": [
                        station["station_name"],
                        line_label(line_no),
                        str(line_no),
                        f"{line_no}号",
                        f"{line_no}号线",
                        f"{line_label(line_no)} {station['station_name']}",
                        f"{line_no} {station['station_name']}",
                    ],
                }
            )
    return sorted(items, key=lambda item: (line_sort_key(item["line_no"]), item["station_name"]))


def build_station_search_index(stations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items = []
    for station in stations:
        if not station["has_display_toilet"]:
            continue
        line_labels = [line_label(item) for item in sorted(station["lines"], key=line_sort_key)]
        items.append(
            {
                "search_type": "station_detail",
                "station_id": station["station_id"],
                "station_name": station["station_name"],
                "line_nos": sorted(station["lines"], key=line_sort_key),
                "line_labels": line_labels,
                "display_name": f"{' / '.join(line_labels)} · {station['station_name']}",
                "keywords": [station["station_name"], *line_labels],
                "legend_types": station["legend_types"],
            }
        )
    return sorted(items, key=lambda item: item["station_name"])


def prepare(input_path: Path, output_root: Path) -> None:
    stations = load_json(input_path)
    station_entities = merge_station_entities(stations)

    station_details = [build_station_detail(station) for station in station_entities]
    station_detail_map = {station["station_id"]: station for station in station_details}
    browse_data = build_browse_data(station_details)
    route_search_index = build_route_search_index(station_entities)
    station_search_index = build_station_search_index(station_details)

    app_bundle = {
        "station_detail_map": station_detail_map,
        "browse_data": browse_data,
        "route_search_index": route_search_index,
        "station_search_index": station_search_index,
    }
    summary = {
        "station_detail_count": len(station_details),
        "display_station_count": sum(1 for station in station_details if station["has_display_toilet"]),
        "line_section_count": len(browse_data["lines"]),
        "route_search_item_count": len(route_search_index),
        "station_search_item_count": len(station_search_index),
    }

    write_json(output_root / "station_details.json", station_details)
    write_json(output_root / "station_detail_map.json", station_detail_map)
    write_json(output_root / "browse_data.json", browse_data)
    write_json(output_root / "route_search_index.json", route_search_index)
    write_json(output_root / "station_search_index.json", station_search_index)
    write_json(output_root / "app_bundle.json", app_bundle)
    write_json(output_root / "summary.app.json", summary)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare frontend-ready Shanghai Metro toilet datasets."
    )
    parser.add_argument(
        "--input",
        default="output/shmetro/normalized/stations.normalized.json",
        help="Normalized station JSON generated by shmetro_normalize.py",
    )
    parser.add_argument(
        "--output-root",
        default="output/shmetro/app",
        help="Directory for frontend-ready outputs",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    try:
        prepare(Path(args.input), Path(args.output_root))
    except Exception as exc:  # pragma: no cover
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
