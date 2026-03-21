/*******************************************************************************
* OCCUPATION & AI IMPACT EXPLORER — Clean Exposure Indices
* Purpose: Import, normalize, and harmonize 6 AI exposure indices
* Input:   rawdata/exposure/eloundou_occ_level.xlsx
*          rawdata/exposure/aei_onet_final.csv
*          rawdata/exposure/felten_lm_aioe.xlsx
*          rawdata/exposure/genoe_soc18.xlsx
*          rawdata/exposure/pizzinelli_caioe.xlsx
*          rawdata/exposure/brynjolfsson_sml.csv
*          rawdata/exposure/soc_2010_to_2018_crosswalk.xlsx
* Output:  data/exposure_eloundou.dta
*          data/exposure_aei.dta
*          data/exposure_felten.dta
*          data/exposure_genoe.dta
*          data/exposure_pizzinelli.dta
*          data/exposure_sml.dta
*
* Note: All indices are normalized to 0-1 for the website.
*       Adapted from ai-adaptation-educ/do/anthropic_index_visualization/code/
*       3-compute_exposure_6dig.do (Boyette & Reyes)
*******************************************************************************/

#delimit ;
clear all ; set more off ;


*==============================================================================;
* STEP 1: Eloundou et al. (2023) — already 0-1                                ;
*==============================================================================;

import excel "${raw}/exposure/eloundou_occ_level.xlsx", firstrow clear         ;

rename ONETSOCCode soc                                                         ;
rename gpt4_alpha  eloundou_alpha                                              ;
rename gpt4_beta   eloundou_beta                                               ;
rename gpt4_gamma  eloundou_gamma                                              ;
keep soc eloundou_alpha eloundou_beta eloundou_gamma                           ;

sort soc                                                                       ;
compress                                                                       ;
save "${dat}/exposure_eloundou.dta", replace                                   ;

di as result "Eloundou: `=_N' occupations"                                     ;


*==============================================================================;
* STEP 2: Anthropic Economic Index (2025) — already 0-1                        ;
*==============================================================================;

import delimited "${raw}/exposure/aei_onet_final.csv", clear                   ;

keep if row_type == "original"                                                 ;

rename onet_soc_code soc                                                       ;
rename pct_tasks_automation  aei_automation                                    ;
rename pct_tasks_augmentation aei_augmentation                                 ;
rename mean_automation       aei_mean_automation                               ;
rename mean_augmentation     aei_mean_augmentation                             ;

* Rescale mean measures from 0-100 to 0-1
replace aei_mean_automation    = aei_mean_automation / 100                     ;
replace aei_mean_augmentation  = aei_mean_augmentation / 100                   ;

keep soc aei_automation aei_augmentation aei_mean_automation aei_mean_augmentation ;

sort soc                                                                       ;
compress                                                                       ;
save "${dat}/exposure_aei.dta", replace                                        ;

di as result "AEI: `=_N' occupations"                                          ;


*==============================================================================;
* STEP 3: Felten, Raj & Seamans (2023) — normalize to 0-1                     ;
*==============================================================================;

import excel "${raw}/exposure/felten_lm_aioe.xlsx",
    sheet("LM AIOE") firstrow clear                                            ;

rename SOCCode soc_6dig                                                        ;
rename LanguageModelingAIOE felten_raw                                         ;
keep soc_6dig felten_raw                                                       ;
destring felten_raw, replace                                                   ;

* Min-max normalize to 0-1
qui sum felten_raw                                                             ;
gen felten = (felten_raw - r(min)) / (r(max) - r(min))                         ;
drop felten_raw                                                                ;

* Add .00 suffix for O*NET merge
gen soc = soc_6dig + ".00"                                                     ;
drop soc_6dig                                                                  ;

sort soc                                                                       ;
compress                                                                       ;
save "${dat}/exposure_felten.dta", replace                                     ;

di as result "Felten: `=_N' occupations"                                       ;


*==============================================================================;
* STEP 4: GENOE / Georgieff & Hyee (2024) — already 0-1                       ;
*==============================================================================;

import excel "${raw}/exposure/genoe_soc18.xlsx", firstrow clear                ;

rename soc_code_18 soc_6dig                                                    ;
* Use 5-year horizon as the primary measure
rename GENOE_5_year genoe                                                      ;
keep soc_6dig genoe                                                            ;

gen soc = soc_6dig + ".00"                                                     ;
drop soc_6dig                                                                  ;

sort soc                                                                       ;
compress                                                                       ;
save "${dat}/exposure_genoe.dta", replace                                      ;

di as result "GENOE: `=_N' occupations"                                        ;


*==============================================================================;
* STEP 5: Pizzinelli et al. (2023) — SOC 2010, needs crosswalk + normalize    ;
*==============================================================================;

* 5a. Import crosswalk (SOC 2010 → 2018)
import excel "${raw}/exposure/soc_2010_to_2018_crosswalk.xlsx",
    cellrange(A9) firstrow clear                                               ;

rename A soc_2010                                                              ;
rename C soc_2018                                                              ;
keep soc_2010 soc_2018                                                         ;
drop if missing(soc_2010) | missing(soc_2018)                                  ;

* Some 2010 codes map to multiple 2018 codes; keep unique pairs
duplicates drop                                                                ;
tempfile xwalk                                                                 ;
save `xwalk', replace                                                          ;

* 5b. Import Pizzinelli data
import excel "${raw}/exposure/pizzinelli_caioe.xlsx",
    sheet("data_US_SOC2010") firstrow clear                                    ;

* occ_code is a formula; soc10 is the numeric version
tostring soc10, gen(soc_2010) format(%06.0f)                                   ;
replace soc_2010 = substr(soc_2010, 1, 2) + "-" + substr(soc_2010, 3, 4)      ;

rename c_aioe pizzinelli_raw                                                   ;
keep soc_2010 pizzinelli_raw                                                   ;
destring pizzinelli_raw, replace                                               ;

* 5c. Crosswalk to SOC 2018
merge m:1 soc_2010 using `xwalk'                                              ;
tab _merge                                                                     ;
keep if _merge == 3                                                            ;
drop _merge soc_2010                                                           ;

* Average if multiple 2010 codes map to same 2018 code
collapse (mean) pizzinelli_raw, by(soc_2018)                                   ;

* Min-max normalize to 0-1
qui sum pizzinelli_raw                                                         ;
gen pizzinelli = (pizzinelli_raw - r(min)) / (r(max) - r(min))                 ;
drop pizzinelli_raw                                                            ;

rename soc_2018 soc_6dig                                                       ;
gen soc = soc_6dig + ".00"                                                     ;
drop soc_6dig                                                                  ;

sort soc                                                                       ;
compress                                                                       ;
save "${dat}/exposure_pizzinelli.dta", replace                                 ;

di as result "Pizzinelli: `=_N' occupations"                                   ;


*==============================================================================;
* STEP 6: Brynjolfsson, Mitchell & Rock (2018) — normalize to 0-1             ;
*==============================================================================;

import delimited "${raw}/exposure/brynjolfsson_sml.csv", clear                 ;

rename onetsoccode soc                                                         ;
rename msml sml_raw                                                            ;
keep soc sml_raw                                                               ;
destring sml_raw, replace                                                      ;

* Min-max normalize to 0-1
qui sum sml_raw                                                                ;
gen sml = (sml_raw - r(min)) / (r(max) - r(min))                              ;
drop sml_raw                                                                   ;

sort soc                                                                       ;
compress                                                                       ;
save "${dat}/exposure_sml.dta", replace                                        ;

di as result "Brynjolfsson SML: `=_N' occupations"                             ;
