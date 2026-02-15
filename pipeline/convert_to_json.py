import pandas as pd
import os
import json
import math

INPUT_DIR = "extracted"
OUTPUT_FILE = "extracted.json"

def clean_value(val):
    if pd.isna(val) or (isinstance(val, float) and math.isnan(val)):
        return None
    return val

all_data = []

for filename in os.listdir(INPUT_DIR):
    if not filename.endswith(".csv"):
        continue
    
    df = pd.read_csv(os.path.join(INPUT_DIR, filename))
    
    for _, row in df.iterrows():
        record = row.to_dict()
        record = {k: clean_value(v) for k, v in record.items()}
        
        # Use final_status if available and valid, otherwise use status, then normalize to lowercase
        final_status = record.get("final_status")
        if final_status and str(final_status).strip():
            record["status"] = str(final_status).lower().strip()
        else:
            record["status"] = str(record.get("status", "unknown")).lower().strip()
        
        # Clean up intermediate fields
        record.pop("subject", None)
        record.pop("body", None)
        record.pop("final_status", None)
        
        all_data.append(record)

with open(OUTPUT_FILE, "w") as f:
    json.dump(all_data, f, indent=2)

print(f"\n=== METRICS ===")
print(f"total:{len(all_data)}")
print(f"==============")

print(f"Converted {len(all_data)} records to {OUTPUT_FILE}")

# Show status breakdown
status_counts = {}
for record in all_data:
    status = record.get("status", "unknown")
    status_counts[status] = status_counts.get(status, 0) + 1

print("Status breakdown:")
for status, count in sorted(status_counts.items()):
    print(f"  {status}: {count}")
