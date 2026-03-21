"""
Process raw Anthropic Economic Index data from HuggingFace into
occupation-level automation/augmentation measures.

Replicates the logic from ai-adaptation-educ pipeline:
  1-clean-anthropic-data.do
  2-aggregate-aei-at-occupation-level.do

Reads:
  rawdata/exposure/aei/automation_vs_augmentation_by_task.csv
  rawdata/exposure/aei/onet_task_statements.csv
Writes:
  rawdata/exposure/aei_occupation_level.csv

Automation = directive + feedback_loop
Augmentation = validation + task_iteration + learning
"""

import os
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AEI_DIR = os.path.join(ROOT, "rawdata", "exposure", "aei")
OUT = os.path.join(ROOT, "rawdata", "exposure", "aei_occupation_level.csv")


# ── 1. Load task-level automation/augmentation fractions ────────────────────

collab = pd.read_csv(os.path.join(AEI_DIR, "automation_vs_augmentation_by_task.csv"))
print(f"Task collaboration data: {len(collab)} tasks")

# Compute automation and augmentation shares per task
# Automation = directive + feedback_loop
# Augmentation = validation + task_iteration + learning
collab["automation"] = collab["directive"].fillna(0) + collab["feedback_loop"].fillna(0)
collab["augmentation"] = (
    collab["validation"].fillna(0)
    + collab["task_iteration"].fillna(0)
    + collab["learning"].fillna(0)
)

# Clean task name for matching
collab["task_clean"] = (
    collab["task_name"]
    .str.lower()
    .str.replace(",", "", regex=False)
    .str.replace(";", "", regex=False)
    .str.strip()
    .str.replace(r"\s+", " ", regex=True)
)


# ── 2. Load O*NET task statements (maps tasks to SOC codes) ────────────────

onet = pd.read_csv(os.path.join(AEI_DIR, "onet_task_statements.csv"))
print(f"O*NET task statements: {len(onet)} rows")

onet = onet.rename(columns={"O*NET-SOC Code": "soc", "Task": "task_text"})
onet["is_core"] = onet["Task Type"] == "Core"

# Extract 6-digit SOC (no dots, no hyphens) for grouping
onet["soc_6digit"] = onet["soc"].str.replace(".", "", regex=False).str.replace("-", "", regex=False).str[:6]

# Clean task text for matching
onet["task_clean"] = (
    onet["task_text"]
    .str.lower()
    .str.replace(",", "", regex=False)
    .str.replace(";", "", regex=False)
    .str.strip()
    .str.replace(r"\s+", " ", regex=True)
)


# ── 3. Match tasks ─────────────────────────────────────────────────────────

merged = onet.merge(collab[["task_clean", "automation", "augmentation"]], on="task_clean", how="left")

matched = merged["automation"].notna().sum()
total = len(merged)
print(f"Matched {matched} of {total} O*NET tasks to AEI data ({matched/total:.1%})")


# ── 4. Aggregate to occupation level ───────────────────────────────────────

# For each occupation: keep core tasks if available, otherwise all tasks
def pick_tasks(group):
    core = group[group["is_core"]]
    return core if len(core) > 0 else group

tasks_for_agg = merged.groupby("soc_6digit", group_keys=False).apply(pick_tasks)

# Only keep tasks that matched to AEI data
tasks_with_data = tasks_for_agg.dropna(subset=["automation"])

# Compute occupation-level measures
occ_level = tasks_with_data.groupby("soc_6digit").agg(
    # Extensive margin: share of tasks with any positive automation/augmentation
    pct_tasks_automation=("automation", lambda x: (x > 0).mean()),
    pct_tasks_augmentation=("augmentation", lambda x: (x > 0).mean()),
    # Intensive margin: mean automation/augmentation across tasks
    mean_automation=("automation", "mean"),
    mean_augmentation=("augmentation", "mean"),
    n_tasks_matched=("automation", "count"),
).reset_index()

# Convert soc_6digit back to standard format (XX-XXXX.00)
occ_level["soc"] = (
    occ_level["soc_6digit"].str[:2] + "-" + occ_level["soc_6digit"].str[2:] + ".00"
)

occ_level = occ_level.drop(columns=["soc_6digit"])
occ_level = occ_level[["soc", "pct_tasks_automation", "pct_tasks_augmentation",
                        "mean_automation", "mean_augmentation", "n_tasks_matched"]]

occ_level.to_csv(OUT, index=False)
print(f"\nSaved {len(occ_level)} occupations to {os.path.basename(OUT)}")
print(occ_level.describe().round(4))
