import csv
import json
import os
import sys


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
