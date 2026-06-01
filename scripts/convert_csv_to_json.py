import csv
import json
import os
import sys

IRELAND_POLYGON = [
    (-10.6, 51.35),
    (-10.4, 51.7),
    (-10.15, 52.2),
    (-10.0, 52.8),
    (-9.8, 53.35),
    (-9.35, 53.9),
    (-8.95, 54.25),
    (-8.25, 54.6),
    (-7.4, 55.05),
    (-6.35, 55.28),
    (-5.55, 55.02),
    (-5.45, 54.6),
    (-5.75, 54.25),
    (-6.25, 53.95),
    (-6.85, 53.5),
    (-7.35, 53.1),
    (-7.9, 52.75),
    (-8.45, 52.25),
    (-9.05, 51.9),
    (-9.65, 51.65),
    (-10.25, 51.45),
    (-10.6, 51.35),
]

IRELAND_BOUNDS = {
    "min_lat": 51.3,
    "max_lat": 55.7,
    "min_lng": -10.9,
    "max_lng": -5.1,
}


def resolve_paths() -> tuple[str, str]:
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    default_csv = os.path.join(project_root, "HeritageTreesOfIreland_corrected.csv")
    input_csv = sys.argv[1] if len(sys.argv) > 1 else default_csv
    input_csv = os.path.abspath(input_csv)
    output_path = os.path.join(project_root, "public", "data", "trees.json")
    return input_csv, output_path


def to_float(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def maybe_swap_coordinates(lat: float, lng: float) -> tuple[float, float]:
    if -11 < lat < -5 and 51 < lng < 56:
        return lng, lat
    return lat, lng


def point_in_polygon(lat: float, lng: float, polygon: list[tuple[float, float]]) -> bool:
    inside = False
    j = len(polygon) - 1
    for i in range(len(polygon)):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        intersects = ((yi > lat) != (yj > lat)) and (
            lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
        )
        if intersects:
            inside = not inside
        j = i
    return inside


def main() -> int:
    csv_path, output_path = resolve_paths()

    if not os.path.exists(csv_path):
        print(f"Input CSV not found: {csv_path}")
        print("Usage: python scripts/convert_csv_to_json.py <path-to-csv>")
        return 1

    trees = []
    with open(csv_path, newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for i, row in enumerate(reader):
            lng = to_float(row.get("Longitude", "").strip())
            lat = to_float(row.get("Latitude", "").strip())
            if lng is None or lat is None:
                continue
            lat, lng = maybe_swap_coordinates(lat, lng)
            if not (
                IRELAND_BOUNDS["min_lat"] <= lat <= IRELAND_BOUNDS["max_lat"]
                and IRELAND_BOUNDS["min_lng"] <= lng <= IRELAND_BOUNDS["max_lng"]
            ):
                continue
            if not point_in_polygon(lat, lng, IRELAND_POLYGON):
                continue
            trees.append(
                {
                    "id": row.get("RecordKey", str(i)).strip(),
                    "lat": lat,
                    "lng": lng,
                    "commonName": row.get("CommonName", "").strip(),
                    "taxonName": row.get("TaxonName", "").strip(),
                    "siteName": row.get("SiteName", "").strip(),
                    "county": row.get("County", "").strip(),
                    "broadType": row.get("BroadType", "").strip(),
                    "heritageType": row.get("Heritage Type", "").strip(),
                    "category": row.get("Category of Tree", "").strip(),
                    "form": row.get("Tree form", "").strip(),
                    "condition": row.get("Condition of tree", "").strip(),
                    "ageRange": row.get("Age Range", "").strip(),
                    "evidence": row.get("Evidence of", "").strip(),
                }
            )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as json_file:
        json.dump(trees, json_file, indent=2, ensure_ascii=False)

    print(f"Converted {len(trees)} trees to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
