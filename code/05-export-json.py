"""
OCCUPATION & AI IMPACT EXPLORER — Export Stata datasets to JSON

Reads:  data/occupations_merged.dta
        data/onet_tasks.dta
Writes: src/occupations.json
        src/tasks.json
        src/summaries.json

Run from the project root or via:  python code/05-export-json.py
"""

import os
import json
import pandas as pd

# Resolve paths relative to this script
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
SRC  = os.path.join(ROOT, "src")
PUB  = os.path.join(ROOT, "public", "data")

os.makedirs(SRC, exist_ok=True)
os.makedirs(PUB, exist_ok=True)


# ── 1. Load merged occupation data ──────────────────────────────────────────

df = pd.read_stata(os.path.join(DATA, "occupations_merged.dta"))
print(f"Loaded {len(df)} occupations from occupations_merged.dta")

# Build occupations.json
occupations = []
for _, r in df.iterrows():
    occ = {
        "soc": r["soc"],
        "title": r["occ_title"],
        "employment": int(r["employment"]) if pd.notna(r["employment"]) else None,
        "meanWage": int(r["mean_wage"]) if pd.notna(r["mean_wage"]) else None,
        "employmentShare": round(r["employment_share"], 6) if pd.notna(r["employment_share"]) else 0,
        "taskCount": int(r["task_count"]),
        "exposure": {},
    }

    # BLS Employment Projections (2024-34)
    if pd.notna(r.get("emp_change_pct")):
        occ["projGrowthPct"] = round(float(r["emp_change_pct"]), 1)
    if pd.notna(r.get("annual_openings")):
        occ["annualOpenings"] = round(float(r["annual_openings"]) * 1000)
    if pd.notna(r.get("entry_education")) and str(r["entry_education"]).strip():
        occ["entryEducation"] = str(r["entry_education"]).strip()
    if pd.notna(r.get("ojt")) and str(r["ojt"]).strip():
        occ["ojt"] = str(r["ojt"]).strip()

    # Add alt titles if present
    if pd.notna(r.get("alt_titles")) and r["alt_titles"].strip():
        occ["altTitles"] = [t.strip() for t in r["alt_titles"].split(" | ") if t.strip()]

    # Exposure indices
    for col, key in [
        ("eloundou_alpha", "eloundou_alpha"),
        ("eloundou_beta", "eloundou_beta"),
        ("eloundou_gamma", "eloundou_gamma"),
        ("aei_automation", "aei_automation"),
        ("aei_augmentation", "aei_augmentation"),
        ("aei_mean_automation", "aei_mean_automation"),
        ("aei_mean_augmentation", "aei_mean_augmentation"),
        ("felten", "felten"),
        ("genoe", "genoe"),
        ("pizzinelli", "pizzinelli"),
        ("sml", "sml"),
    ]:
        if col in r.index and pd.notna(r[col]):
            occ["exposure"][key] = round(float(r[col]), 4)

    occupations.append(occ)

with open(os.path.join(SRC, "occupations.json"), "w", encoding="utf-8") as f:
    json.dump(occupations, f, separators=(",", ":"))

print(f"  -> occupations.json: {len(occupations)} entries")


# ── 2. Load task statements ─────────────────────────────────────────────────

tasks_df = pd.read_stata(os.path.join(DATA, "onet_tasks.dta"))
print(f"Loaded {len(tasks_df)} task rows from onet_tasks.dta")

tasks = {}
for soc, group in tasks_df.groupby("soc"):
    tasks[soc] = group["task"].tolist()

# For occupations with no tasks, try inheriting from sub-codes
soc_set = set(df["soc"])
for soc in soc_set:
    if soc not in tasks or len(tasks[soc]) == 0:
        prefix = soc[:7]
        sub_tasks = []
        seen = set()
        for k, v in tasks.items():
            if k.startswith(prefix) and k != soc:
                for t in v:
                    if t not in seen:
                        seen.add(t)
                        sub_tasks.append(t)
        if sub_tasks:
            tasks[soc] = sub_tasks

# tasks.json is fetched at runtime from public/data/, not bundled
for out_dir in (SRC, PUB):
    with open(os.path.join(out_dir, "tasks.json"), "w", encoding="utf-8") as f:
        json.dump(tasks, f, separators=(",", ":"))

total_tasks = sum(len(v) for v in tasks.values())
print(f"  -> tasks.json: {total_tasks} tasks across {len(tasks)} occupations")


# ── 3. Build summaries ──────────────────────────────────────────────────────

summaries = {}
for occ in occupations:
    soc = occ["soc"]
    t = tasks.get(soc, [])
    if len(t) >= 3:
        shorts = []
        for task in t[:3]:
            s = task[:80].rsplit(" ", 1)[0] if len(task) > 80 else task
            shorts.append(s.rstrip("."))
        summaries[soc] = (
            f"{occ['title']} {shorts[0].lower()}, "
            f"{shorts[1].lower()}, and {shorts[2].lower()}."
        )
    elif len(t) > 0:
        summaries[soc] = f"{occ['title']} {', '.join(s.lower() for s in t)}."
    else:
        summaries[soc] = f"Professionals in this field work as {occ['title'].lower()}."

with open(os.path.join(SRC, "summaries.json"), "w", encoding="utf-8") as f:
    json.dump(summaries, f, separators=(",", ":"))

print(f"  -> summaries.json: {len(summaries)} entries")
print("Done.")
