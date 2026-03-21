/*******************************************************************************
* OCCUPATION & AI IMPACT EXPLORER - Clean Exposure Indices
* Purpose: Import, normalize, and harmonize 6 AI exposure indices
* Input:   rawdata/exposure/eloundou_occ_level.xlsx
*          rawdata/exposure/aei_occupation_level.csv (built by process-aei.py)
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
* Note: All indices normalized to 0-1. Adapted from
*       ai-adaptation-educ/do/anthropic_index_visualization/code/
*       3-compute_exposure_6dig.do (Boyette & Reyes)
*******************************************************************************/

#delimit;
clear all; set more off;

glo user = lower("`=c(username)'")                       ;
glo root "C:/Users/${user}/Dropbox/Admin/website/occ_exposure" ;
glo raw  "${root}/rawdata"                               ;
glo dat  "${root}/data"                                  ;
glo cod  "${root}/code"                                  ;


*==============================================================================;
* STEP 1: Eloundou et al. (2023) - already 0-1                                ;
*==============================================================================;

import excel "${raw}/exposure/eloundou_occ_level.xlsx",
    firstrow clear                                       ;

rename ONETSOCCode soc                                   ;
rename gpt4_alpha  eloundou_alpha                        ;
rename gpt4_beta   eloundou_beta                         ;
rename gpt4_gamma  eloundou_gamma                        ;
keep soc eloundou_alpha eloundou_beta eloundou_gamma     ;

sort soc                                                 ;
compress                                                 ;
save "${dat}/exposure_eloundou.dta", replace             ;

di as result "Eloundou: `=_N' occupations"               ;


*==============================================================================;
* STEP 2: Anthropic Economic Index (2025) - already 0-1                        ;
*         Built from HuggingFace raw data by process-aei.py                    ;
*==============================================================================;

import delimited "${raw}/exposure/aei_occupation_level.csv",
    clear                                                ;

rename pct_tasks_automation   aei_automation             ;
rename pct_tasks_augmentation aei_augmentation           ;
rename mean_automation        aei_mean_automation        ;
rename mean_augmentation      aei_mean_augmentation      ;

keep soc aei_automation aei_augmentation
    aei_mean_automation aei_mean_augmentation            ;

sort soc                                                 ;
compress                                                 ;
save "${dat}/exposure_aei.dta", replace                  ;

di as result "AEI: `=_N' occupations"                    ;


*==============================================================================;
* STEP 3: Felten, Raj & Seamans (2023) - normalize to 0-1                     ;
*==============================================================================;

import excel "${raw}/exposure/felten_lm_aioe.xlsx",
    sheet("LM AIOE") firstrow clear                      ;

rename SOCCode soc_6dig                                  ;
rename LanguageModelingAIOE felten_raw                   ;
keep soc_6dig felten_raw                                 ;
destring felten_raw, replace                             ;

qui sum felten_raw                                       ;
gen felten = (felten_raw - r(min)) / (r(max) - r(min))  ;
drop felten_raw                                          ;

gen soc = soc_6dig + ".00"                               ;
drop soc_6dig                                            ;

sort soc                                                 ;
compress                                                 ;
save "${dat}/exposure_felten.dta", replace               ;

di as result "Felten: `=_N' occupations"                 ;


*==============================================================================;
* STEP 4: GENOE / Georgieff & Hyee (2024) - already 0-1                       ;
*==============================================================================;

import excel "${raw}/exposure/genoe_soc18.xlsx",
    firstrow clear                                       ;

rename soc_code_18 soc_6dig                              ;
rename GENOE_5_year genoe                                ;
keep soc_6dig genoe                                      ;

gen soc = soc_6dig + ".00"                               ;
drop soc_6dig                                            ;

sort soc                                                 ;
compress                                                 ;
save "${dat}/exposure_genoe.dta", replace                ;

di as result "GENOE: `=_N' occupations"                  ;


*==============================================================================;
* STEP 5: Pizzinelli et al. (2023) - SOC 2010, crosswalk + normalize          ;
*==============================================================================;

* 5a. Import Pizzinelli data (CSV, xlsx has formula cells) ;
import delimited "${raw}/exposure/pizzinelli_caioe_clean.csv", clear ;

rename occ_code soc_6dig                                 ;
rename c_aioe pizzinelli_raw                             ;
keep soc_6dig pizzinelli_raw                             ;
destring pizzinelli_raw, replace                         ;

* Most SOC 2010 codes are identical to SOC 2018           ;
* Average if multiple rows per code                       ;
collapse (mean) pizzinelli_raw, by(soc_6dig)             ;

qui sum pizzinelli_raw                                   ;
gen pizzinelli =
    (pizzinelli_raw - r(min)) / (r(max) - r(min))        ;
drop pizzinelli_raw                                      ;
gen soc = soc_6dig + ".00"                               ;
drop soc_6dig                                            ;

sort soc                                                 ;
compress                                                 ;
save "${dat}/exposure_pizzinelli.dta", replace            ;

di as result "Pizzinelli: `=_N' occupations"             ;


*==============================================================================;
* STEP 6: Brynjolfsson, Mitchell & Rock (2018) - normalize to 0-1             ;
*==============================================================================;

import delimited "${raw}/exposure/brynjolfsson_sml.csv",
    clear                                                ;

rename onetsoccode soc                                   ;
rename msml sml_raw                                      ;
keep soc sml_raw                                         ;
destring sml_raw, replace                                ;

qui sum sml_raw                                          ;
gen sml = (sml_raw - r(min)) / (r(max) - r(min))        ;
drop sml_raw                                             ;

sort soc                                                 ;
compress                                                 ;
save "${dat}/exposure_sml.dta", replace                  ;

di as result "Brynjolfsson SML: `=_N' occupations"       ;
