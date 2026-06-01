import csv
import json
import os

csv_path = os.path.join(os.path.dirname(__file__), '..', 'HeritageTreesOfIreland_corrected.csv')
output_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'trees.json')

trees = []
with open(csv_path, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        lon_val = row.get('Longitude', '').strip()
        lat_val = row.get('Latitude', '').strip()
        if not lon_val or not lat_val:
            continue
        try:
            lng = float(lon_val)  # CSV "Longitude" col holds actual longitude (~-9.x)
            lat = float(lat_val)  # CSV "Latitude" col holds actual latitude (~53.x)
        except ValueError:
            continue
        trees.append({
            'id': row.get('RecordKey', str(i)).strip(),
            'lat': lat,   # ~53.x
            'lng': lng,   # ~-9.x
            'commonName': row.get('CommonName', '').strip(),
            'taxonName': row.get('TaxonName', '').strip(),
            'siteName': row.get('SiteName', '').strip(),
            'county': row.get('County', '').strip(),
            'broadType': row.get('BroadType', '').strip(),
            'heritageType': row.get('Heritage Type', '').strip(),
            'category': row.get('Category of Tree', '').strip(),
            'form': row.get('Tree form', '').strip(),
            'condition': row.get('Condition of tree', '').strip(),
            'ageRange': row.get('Age Range', '').strip(),
            'evidence': row.get('Evidence of', '').strip(),
        })

os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(trees, f, indent=2, ensure_ascii=False)

print(f"Converted {len(trees)} trees to {output_path}")
