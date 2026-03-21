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

# Clean task name for matching -- simple lowercase + strip + whitespace normalize
# (AEI task names already exist verbatim in O*NET; don't strip commas/semicolons
# as that creates duplicate task_clean values and causes many-to-many merges)
collab["task_clean"] = (
    collab["task_name"]
    .str.lower()
    .str.strip()
    .str.replace(r"\s+", " ", regex=True)
)

# Deduplicate on task_clean to prevent many-to-many merges
collab = collab.drop_duplicates(subset="task_clean", keep="first")


# ── 2. Load O*NET task statements (maps tasks to SOC codes) ────────────────

onet = pd.read_csv(os.path.join(AEI_DIR, "onet_task_statements.csv"))
print(f"O*NET task statements: {len(onet)} rows")

onet = onet.rename(columns={"O*NET-SOC Code": "soc", "Task": "task_text"})
onet["is_core"] = onet["Task Type"] == "Core"

# Clean task text for matching (same normalization as collab)
onet["task_clean"] = (
    onet["task_text"]
    .str.lower()
    .str.strip()
    .str.replace(r"\s+", " ", regex=True)
)


# ── 3. Match tasks ─────────────────────────────────────────────────────────

merged = onet.merge(collab[["task_clean", "automation", "augmentation"]], on="task_clean", how="left")

matched = merged["automation"].notna().sum()
total = len(merged)
print(f"Matched {matched} of {total} O*NET tasks to AEI data ({matched/total:.1%})")


# ── 4. Aggregate to full 8-digit SOC level ─────────────────────────────────

# For each occupation: keep core tasks if available, otherwise all tasks
def pick_tasks(group):
    core = group[group["is_core"]]
    return core if len(core) > 0 else group

tasks_for_agg = merged.groupby("soc", group_keys=False).apply(pick_tasks)

# Only keep tasks that matched to AEI data
tasks_with_data = tasks_for_agg.dropna(subset=["automation"])

# Compute occupation-level measures at full 8-digit SOC
occ_level = tasks_with_data.groupby("soc").agg(
    # Extensive margin: share of tasks with any positive automation/augmentation
    pct_tasks_automation=("automation", lambda x: (x > 0).mean()),
    pct_tasks_augmentation=("augmentation", lambda x: (x > 0).mean()),
    # Intensive margin: mean automation/augmentation across tasks
    mean_automation=("automation", "mean"),
    mean_augmentation=("augmentation", "mean"),
    n_tasks_matched=("automation", "count"),
).reset_index()


# ── 5. Fill .00 parent codes from sub-code means where needed ──────────────

# Extract 6-digit prefix for parent/child grouping
occ_level["soc_prefix"] = occ_level["soc"].str[:7]  # "XX-XXXX"

# Identify .00 parents that are missing (have sub-codes but no direct .00 row)
existing_parents = set(occ_level.loc[occ_level["soc"].str.endswith(".00"), "soc_prefix"])
all_prefixes = set(occ_level["soc_prefix"])
sub_only = occ_level[~occ_level["soc"].str.endswith(".00")]
prefixes_needing_parent = set(sub_only["soc_prefix"]) - existing_parents

if prefixes_needing_parent:
    # For each prefix without a .00 row, compute mean of sub-code scores
    fill_rows = []
    for prefix in sorted(prefixes_needing_parent):
        children = occ_level[occ_level["soc_prefix"] == prefix]
        fill_rows.append({
            "soc": prefix + ".00",
            "pct_tasks_automation": children["pct_tasks_automation"].mean(),
            "pct_tasks_augmentation": children["pct_tasks_augmentation"].mean(),
            "mean_automation": children["mean_automation"].mean(),
            "mean_augmentation": children["mean_augmentation"].mean(),
            "n_tasks_matched": children["n_tasks_matched"].sum(),
            "soc_prefix": prefix,
        })
    fill_df = pd.DataFrame(fill_rows)
    occ_level = pd.concat([occ_level, fill_df], ignore_index=True)
    print(f"Filled {len(fill_rows)} parent .00 codes from sub-code means")

occ_level = occ_level.drop(columns=["soc_prefix"])
occ_level = occ_level.sort_values("soc").reset_index(drop=True)
occ_level = occ_level[["soc", "pct_tasks_automation", "pct_tasks_augmentation",
                        "mean_automation", "mean_augmentation", "n_tasks_matched"]]

occ_level.to_csv(OUT, index=False)
print(f"\nSaved {len(occ_level)} occupations to {os.path.basename(OUT)}")
print(occ_level.describe().round(4))
