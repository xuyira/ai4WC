#!/usr/bin/env python3
"""Scrape Shanghai Metro station toilet info and floorplan images."""

from __future__ import annotations

import argparse
import csv
import json
import socket
import sys
import time
from pathlib import Path
from typing import Any
from urllib import error, parse, request


STATIONS_URL = "https://m.shmetro.com/core/shmetro/mdstationinfoback_new.ashx?act=getAllStations"
STATION_INFO_URL = (
    "https://m.shmetro.com/interface/metromap/metromap.aspx?func=stationInfo&stat_id={station_id}"
)
FLOORPLAN_URL = "https://service.shmetro.com/skin/zct/{station_id}.jpg"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
)
RETRYABLE_EXCEPTIONS = (error.URLError, TimeoutError, socket.timeout)


def build_opener() -> request.OpenerDirector:
    opener = request.build_opener()
    opener.addheaders = [
        ("User-Agent", USER_AGENT),
        ("Accept", "application/json, text/plain, */*"),
        ("Referer", "https://service.shmetro.com/"),
        ("Origin", "https://service.shmetro.com"),
    ]
    return opener


def fetch_text(opener: request.OpenerDirector, url: str, attempts: int = 3) -> str:
    for attempt in range(1, attempts + 1):
        try:
            with opener.open(url, timeout=30) as response:
                return response.read().decode("utf-8")
        except RETRYABLE_EXCEPTIONS:
            if attempt == attempts:
                raise
            time.sleep(0.5 * attempt)
    raise RuntimeError(f"Failed to fetch text after {attempts} attempts: {url}")


def fetch_json(opener: request.OpenerDirector, url: str) -> Any:
    raw_text = fetch_text(opener, url)
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as exc:
        preview = raw_text[:200].replace("\n", " ").strip()
        raise ValueError(f"Invalid JSON from {url}: {preview}") from exc


def fetch_bytes(opener: request.OpenerDirector, url: str, attempts: int = 3) -> bytes:
    for attempt in range(1, attempts + 1):
        try:
            with opener.open(url, timeout=30) as response:
                return response.read()
        except RETRYABLE_EXCEPTIONS:
            if attempt == attempts:
                raise
            time.sleep(0.5 * attempt)
    raise RuntimeError(f"Failed to fetch bytes after {attempts} attempts: {url}")


def sanitize_filename(value: str) -> str:
    safe = []
    for char in value.strip():
        if char.isalnum() or char in {"-", "_"}:
            safe.append(char)
        elif "\u4e00" <= char <= "\u9fff":
            safe.append(char)
        else:
            safe.append("_")
    result = "".join(safe).strip("_")
    return result or "unknown"


def parse_embedded_json(raw_value: Any) -> Any:
    if not raw_value:
        return None
    if isinstance(raw_value, (dict, list)):
        return raw_value
    if isinstance(raw_value, str):
        try:
            return json.loads(raw_value)
        except json.JSONDecodeError:
            return raw_value
    return raw_value


def normalize_toilet_entries(toilet_data: Any) -> list[dict[str, Any]]:
    parsed = parse_embedded_json(toilet_data)
    if not isinstance(parsed, dict):
        return []

    entries = []
    for item in parsed.get("toilet", []):
        if not isinstance(item, dict):
            continue
        entries.append(
            {
                "line_no": item.get("lineno"),
                "icon1": item.get("icon1"),
                "icon2": item.get("icon2"),
                "description": item.get("description"),
            }
        )
    return entries


def normalize_station(base_station: dict[str, str], station_info: dict[str, Any]) -> dict[str, Any]:
    station_id = base_station["key"]
    station_name = base_station["value"]
    toilet_entries = normalize_toilet_entries(station_info.get("toilet_position"))
    lines = station_info.get("lines", "")

    return {
        "station_id": station_id,
        "station_name": station_name,
        "station_info_id": station_info.get("stat_id"),
        "station_code": station_info.get("station_code"),
        "lines": [line.strip() for line in lines.split(",") if line.strip()],
        "toilet_inside": station_info.get("toilet_inside"),
        "toilet_position_en": station_info.get("toilet_position_en"),
        "toilet_entries": toilet_entries,
        "toilet_raw_description": " | ".join(
            entry["description"] for entry in toilet_entries if entry.get("description")
        ),
        "entrance_info": parse_embedded_json(station_info.get("entrance_info")),
        "elevator_info": parse_embedded_json(station_info.get("elevator")),
        "street_pic": station_info.get("street_pic"),
        "error": None,
    }


def build_error_station(base_station: dict[str, str], message: str) -> dict[str, Any]:
    return {
        "station_id": base_station["key"],
        "station_name": base_station["value"],
        "station_info_id": None,
        "station_code": None,
        "lines": [],
        "toilet_inside": None,
        "toilet_position_en": None,
        "toilet_entries": [],
        "toilet_raw_description": "",
        "entrance_info": None,
        "elevator_info": None,
        "street_pic": None,
        "error": message,
    }


def append_error_message(existing: str | None, new_message: str) -> str:
    if not existing:
        return new_message
    if new_message in existing:
        return existing
    return f"{existing} | {new_message}"


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_csv(path: Path, stations: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "station_id",
        "station_name",
        "lines",
        "toilet_inside",
        "toilet_raw_description",
        "toilet_entries_json",
        "floorplan_url",
        "floorplan_local_path",
        "has_floorplan",
        "error",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for station in stations:
            writer.writerow(
                {
                    "station_id": station["station_id"],
                    "station_name": station["station_name"],
                    "lines": ",".join(station["lines"]),
                    "toilet_inside": station["toilet_inside"],
                    "toilet_raw_description": station["toilet_raw_description"],
                    "toilet_entries_json": json.dumps(
                        station["toilet_entries"], ensure_ascii=False
                    ),
                    "floorplan_url": station["floorplan_url"],
                    "floorplan_local_path": station["floorplan_local_path"],
                    "has_floorplan": station["has_floorplan"],
                    "error": station["error"],
                }
            )


def download_floorplan(
    opener: request.OpenerDirector,
    station_id: str,
    station_name: str,
    output_dir: Path,
    skip_existing: bool,
) -> tuple[bool, str, str]:
    floorplan_url = FLOORPLAN_URL.format(station_id=station_id)
    filename = f"{station_id}_{sanitize_filename(station_name)}.jpg"
    local_path = output_dir / filename

    if skip_existing and local_path.exists():
        return True, floorplan_url, str(local_path)

    try:
        image_bytes = fetch_bytes(opener, floorplan_url)
    except error.HTTPError as exc:
        if exc.code == 404:
            return False, floorplan_url, ""
        raise

    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(image_bytes)
    return True, floorplan_url, str(local_path)


def scrape(output_root: Path, limit: int | None, sleep_seconds: float, skip_existing: bool) -> None:
    opener = build_opener()
    all_stations = fetch_json(opener, STATIONS_URL)
    if limit is not None:
        all_stations = all_stations[:limit]

    floorplan_dir = output_root / "floorplans"
    results = []

    for index, base_station in enumerate(all_stations, start=1):
        station_id = base_station["key"]
        station_name = base_station["value"]
        info_url = STATION_INFO_URL.format(station_id=parse.quote(station_id))
        try:
            station_payload = fetch_json(opener, info_url)
            if not station_payload:
                raise RuntimeError("Empty station payload")
            if not isinstance(station_payload[0], dict):
                raise RuntimeError(f"Unexpected station payload item: {station_payload[0]!r}")
            station = normalize_station(base_station, station_payload[0])
        except Exception as exc:
            station = build_error_station(base_station, str(exc))

        try:
            has_floorplan, floorplan_url, local_path = download_floorplan(
                opener=opener,
                station_id=station_id,
                station_name=station_name,
                output_dir=floorplan_dir,
                skip_existing=skip_existing,
            )
        except Exception as exc:
            has_floorplan = False
            floorplan_url = FLOORPLAN_URL.format(station_id=station_id)
            local_path = ""
            station["error"] = append_error_message(station["error"], f"floorplan: {exc}")

        station["has_floorplan"] = has_floorplan
        station["floorplan_url"] = floorplan_url
        station["floorplan_local_path"] = local_path
        results.append(station)

        print(
            f"[{index}/{len(all_stations)}] {station_id} {station_name} "
            f"toilet_entries={len(station['toilet_entries'])} floorplan={has_floorplan}"
            f"{' error=' + station['error'] if station['error'] else ''}",
            flush=True,
        )
        if sleep_seconds:
            time.sleep(sleep_seconds)

    write_json(output_root / "stations.json", results)
    write_csv(output_root / "stations.csv", results)

    summary = {
        "station_count": len(results),
        "floorplan_count": sum(1 for item in results if item["has_floorplan"]),
        "stations_with_toilet_info": sum(1 for item in results if item["toilet_entries"]),
        "stations_with_errors": sum(1 for item in results if item["error"]),
        "generated_files": {
            "json": str(output_root / "stations.json"),
            "csv": str(output_root / "stations.csv"),
            "floorplans_dir": str(floorplan_dir),
        },
    }
    write_json(output_root / "summary.json", summary)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape Shanghai Metro toilet information and floorplan images."
    )
    parser.add_argument(
        "--output-root",
        default="output/shmetro",
        help="Directory used for JSON, CSV, and downloaded floorplan images.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only scrape the first N stations for a trial run.",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.1,
        help="Seconds to sleep between stations.",
    )
    parser.add_argument(
        "--no-skip-existing",
        action="store_true",
        help="Re-download floorplan images even if they already exist locally.",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    try:
        scrape(
            output_root=Path(args.output_root),
            limit=args.limit,
            sleep_seconds=args.sleep,
            skip_existing=not args.no_skip_existing,
        )
    except Exception as exc:  # pragma: no cover
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
