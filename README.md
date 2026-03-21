# Occupation & AI Impact Explorer

An interactive tool for exploring how AI intersects with over 1,000 U.S. occupations. Browse occupations, read what workers actually do, and compare AI exposure scores from six research teams.

**Live site:** [germanr.github.io/occ-exposure](https://germanr.github.io/occ-exposure/)

## Features

- **Browse 1,016 occupations** with images, employment counts, and wages
- **15,000+ task statements** from O\*NET describing what each job actually involves
- **8 AI exposure indices** from six independent research teams, normalized to a common 0--100% scale
- **Search by job title or alias** (e.g., "doctor" finds Physicians, "CEO" finds Chief Executives)
- **Sort** by employment, wage, alphabetical order, or AI exposure
- **Quiz mode**: guess which of two occupations is more exposed to AI, then see the tasks and scores side by side

## Data sources and downloads

All raw data lives in `rawdata/`. The table below documents the source, download link, and status of each file.

### O\*NET (occupations, tasks, alternate titles)

| File | Source | Download |
|------|--------|----------|
| `rawdata/onet/Task Statements.xlsx` | O\*NET 30.2 (Feb 2026) | [onetcenter.org/database.html](https://www.onetcenter.org/database.html) — full Excel zip: [db\_30\_2\_excel.zip](https://www.onetcenter.org/dl_files/database/db_30_2_excel.zip) |
| `rawdata/onet/Occupation Data.xlsx` | O\*NET 30.2 | Same zip as above |
| `rawdata/onet/Alternate Titles.xlsx` | O\*NET 30.2 | Same zip as above |

All three files are **raw source files** extracted from the O\*NET database zip. License: CC BY 4.0, U.S. Department of Labor/ETA.

### BLS employment and wages

| File | Source | Download |
|------|--------|----------|
| `rawdata/bls/national_M2023_dl.xlsx` | BLS Occupational Employment and Wage Statistics, May 2023 | [bls.gov/oes/2023/may/oes\_dl.htm](https://www.bls.gov/oes/2023/may/oes_dl.htm) |

**Raw source file** from BLS. Public domain.

### Exposure indices

| File | Paper | Download | Status |
|------|-------|----------|--------|
| `eloundou_occ_level.xlsx` | Eloundou, Manning, Mishkin & Rock (2023). "GPTs are GPTs." *Science*. [DOI](https://doi.org/10.1126/science.adj0998) | [GitHub: openai/gpts-are-gpts](https://github.com/openai/gpts-are-gpts) — `data/occ_level.csv` | **Raw.** Renamed from the Science supplementary materials. |
| `aei_onet_final.csv` | Handa, Reyes et al. (2025). Anthropic Economic Index. [arxiv.org/abs/2503.04761](https://arxiv.org/abs/2503.04761) | Underlying data: [HuggingFace: Anthropic/EconomicIndex](https://huggingface.co/datasets/Anthropic/EconomicIndex) | **Processed.** Built by the [ai-adaptation-educ](https://github.com/germanjreyes) pipeline, merging AEI task penetration data with BLS employment, O\*NET titles, and education data. Not a direct download. |
| `felten_lm_aioe.xlsx` | Felten, Raj & Seamans (2023). "How Will Language Modelers Like ChatGPT Affect Occupations and Industries?" SSRN. [DOI](https://doi.org/10.2139/ssrn.4375268) | [GitHub: AIOE-Data/AIOE](https://github.com/AIOE-Data/AIOE) — `Language Modeling AIOE and AIIE.xlsx` | **Raw.** Renamed copy of the GitHub file. |
| `genoe_soc18.xlsx` | Georgieff & Hyee (2024). "Artificial Intelligence and Employment." OECD. [DOI](https://doi.org/10.1787/f6c10404-en) | Not publicly available. Obtained from the authors. | **Author-provided.** Contact the authors for access. |
| `pizzinelli_caioe.xlsx` | Pizzinelli, Panton, Tavares, Toscani & Yadav (2023). "Labor Market Exposure to AI." IMF. [DOI](https://www.imf.org/en/Publications/Staff-Discussion-Notes/Issues/2024/01/14/542379) | Not publicly available. Obtained from the authors. | **Author-provided.** Original filename: `AIOE_CAIOE_theta_for_sharing.xlsx`. |
| `brynjolfsson_sml.csv` | Brynjolfsson, Mitchell & Rock (2018). "What Can Machine Learning Do?" *AEA P&P*. [DOI](https://doi.org/10.1257/pandp.20181019) | [OpenICPSR replication package #114436](https://www.openicpsr.org/openicpsr/project/114436) (free account required) | **Raw.** Renamed from `allscores_SML.csv` in the replication package. |

### Crosswalk

| File | Source | Download |
|------|--------|----------|
| `soc_2010_to_2018_crosswalk.xlsx` | BLS Standard Occupational Classification | [bls.gov/soc/soccrosswalks.htm](https://www.bls.gov/soc/soccrosswalks.htm) |

**Raw source file** from BLS.

## Reproducible pipeline

The `code/` folder rebuilds all website data from raw sources. Run `do code/00-master.do` in Stata 18+.

```
rawdata/                         ← raw source files (documented above)
code/
├── 00-master.do                 ← runs everything
├── 01-clean-onet.do             ← tasks, occupations, alt titles
├── 02-clean-bls.do              ← employment and wages
├── 03-clean-exposure.do         ← all 6 indices, normalized to 0-1
├── 04-merge-all.do              ← merge into occupations_merged.dta
└── 05-export-json.py            ← .dta → JSON for the website
data/                            ← intermediate .dta files (git-ignored)
src/                             ← JSON consumed by the React app
```

Exposure indices that are not on a 0--1 scale (Felten, Pizzinelli, Brynjolfsson SML) are min-max normalized in `03-clean-exposure.do`. Pizzinelli uses SOC 2010 codes and is crosswalked to SOC 2018 before merging.

Adapted from the [ai-adaptation-educ](https://github.com/germanjreyes) research pipeline (Boyette, Chuan & Reyes).

## Running locally

```bash
npm install
npx vite        # dev server at localhost:5174
npx vite build  # production build to dist/
```

## Tech stack

React 19, Vite 8, Lodash. No backend; all data is bundled as JSON.

## License

O\*NET data: CC BY 4.0, U.S. Department of Labor/ETA. BLS data: public domain. Exposure indices are from the respective research teams cited above.
