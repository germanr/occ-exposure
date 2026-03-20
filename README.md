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

## Data sources

| Source | What it provides | Coverage |
|--------|-----------------|----------|
| [O\*NET 30.2](https://www.onetcenter.org/) (Feb 2026) | Core task statements for each occupation | 922 of 1,016 occupations |
| [BLS OES](https://www.bls.gov/oes/) (May 2023) | Employment counts and mean annual wages | 819 of 1,016 occupations |
| [Eloundou et al. (2023)](https://doi.org/10.1126/science.adj0998) | Share of tasks exposed at three AI capability tiers | 923 occupations |
| [Anthropic Economic Index (2025)](https://www.anthropic.com/research/the-anthropic-economic-index) | Augmentation and automation rates from real AI usage | 674 occupations |
| [Felten, Raj & Seamans (2023)](https://doi.org/10.2139/ssrn.4375268) | AI capability overlap with occupational skills | 764 occupations |
| [Georgieff & Hyee (2024)](https://doi.org/10.1787/f6c10404-en) | Generative AI exposure at multiple time horizons (OECD) | 764 occupations |
| [Pizzinelli et al. (2023)](https://www.imf.org/en/Publications/WP/Issues/2023/01/13/528101) | Complementarity-adjusted AI exposure (IMF) | 764 occupations |
| [Brynjolfsson, Mitchell & Rock (2018)](https://doi.org/10.1257/pandp.20181019) | Suitability of tasks for machine learning | 764 occupations |

See `data/data_sources.md` for full details on variable definitions, matching procedures, and crosswalk notes.

## Running locally

```bash
npm install
npx vite        # dev server at localhost:5174
npx vite build  # production build to dist/
```

## Tech stack

React 19, Vite 8, Recharts, Lodash. No backend; all data is bundled as JSON.

## License

O\*NET data: CC BY 4.0, U.S. Department of Labor/ETA. BLS data: public domain. Exposure indices are from the respective research teams cited above.
