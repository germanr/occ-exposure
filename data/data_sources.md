# Data Sources for Occupation & AI Impact Explorer

## O*NET Task Statements
- **Source:** O*NET Database (version from local .dta files)
- **File used:** `Research/cc-projects/moravec-paradox/rawdata/onet/task_statements.dta`
- **Filter:** `task_type == "Core"` only (13,417 tasks across 878 occupations)
- **Date accessed:** 2026-03-18 (from local archive)

## BLS Occupational Employment and Wage Statistics (OES)
- **Source:** Bureau of Labor Statistics, May 2023 National Occupational Employment and Wage Estimates
- **File used:** `Research/ai-lab/data_common/exposure_indices/oesm23nat/national_M2023_dl.xlsx`
- **Variables:** `TOT_EMP` (total employment), `A_MEAN` (annual mean wage)
- **Filter:** `O_GROUP == "detailed"` for non-overlapping occupation-level rows
- **Matching:** BLS `OCC_CODE` (XX-XXXX) mapped to O*NET by appending `.00` suffix
- **Coverage:** 819 of 1,016 O*NET occupations matched
- **Date accessed:** 2026-03-18 (from local archive)

## Eloundou et al. (2023) "GPTs are GPTs" Exposure Scores
- **Source:** Eloundou, T., Manning, S., Mishkin, P., & Rock, D. (2023). GPTs are GPTs: An early look at the labor market impact potential of large language models.
- **File used:** `Research/ai-lab/data_common/exposure_indices/Eloundou_et_al_2024/occ_level.xlsx`
- **Variables:**
  - `eloundou_alpha` (`gpt4_alpha`): Share of tasks exposed to LLM alone
  - `eloundou_beta` (`gpt4_beta`): Share of tasks exposed with complementary tools
  - `eloundou_gamma` (`gpt4_gamma`): Share of tasks exposed with full system access
- **Coverage:** 923 of 1,016 O*NET occupations matched
- **Matching:** Direct match on `O*NET-SOC Code`
- **Date accessed:** 2026-03-18 (from local archive)

## Anthropic Economic Index (AEI)
- **Source:** Handa, K., Reyes, G., et al. Anthropic Economic Index.
- **File used:** `Research/ai-adaptation-educ/data/ONET/aei_onet_final.csv`
- **Variables:**
  - `aei_automation` (`pct_tasks_automation`): Share of tasks with automation usage
  - `aei_augmentation` (`pct_tasks_augmentation`): Share of tasks with augmentation usage
  - `aei_mean_automation` (`mean_automation`): Mean automation intensity across tasks
  - `aei_mean_augmentation` (`mean_augmentation`): Mean augmentation intensity across tasks
- **Filter:** `row_type == "original"` (one row per O*NET occupation)
- **Coverage:** 674 of 1,016 O*NET occupations matched
- **Matching:** Direct match on `onet_soc_code`
- **Date accessed:** 2026-03-18 (from local archive)

## O*NET Occupation List
- **Source:** O*NET Database
- **File used:** `Research/cc-projects/moravec-paradox/rawdata/onet/occupation_data.dta`
- **Total occupations:** 1,016

## Crosswalk Notes
- O*NET uses 8-digit codes (XX-XXXX.XX), BLS uses 6-digit (XX-XXXX). Matched by appending `.00`.
- Some O*NET occupations have no BLS counterpart (197 unmatched), typically specialty or emerging occupations.
- Eloundou scores are available for 923 occupations; AEI for 674. Missing values stored as `null`.
- 138 occupations have no Core tasks in O*NET (empty task arrays).
