/*******************************************************************************
* OCCUPATION & AI IMPACT EXPLORER — Merge All Data
* Purpose: Combine O*NET occupations with BLS data and all exposure indices
* Input:   data/onet_occupations.dta
*          data/onet_alt_titles.dta
*          data/bls_employment.dta
*          data/exposure_*.dta
* Output:  data/occupations_merged.dta
*******************************************************************************/

#delimit;
clear all; set more off;

glo user = lower("`=c(username)'")                       ;
glo root "C:/Users/${user}/Dropbox/Admin/website/occ_exposure" ;
glo raw  "${root}/rawdata"                               ;
glo dat  "${root}/data"                                  ;
glo cod  "${root}/code"                                  ;


*==============================================================================;
* STEP 1: Start from occupation list                                           ;
*==============================================================================;

use "${dat}/onet_occupations.dta", clear                 ;
di as result "Starting occupations: `=_N'"               ;


*==============================================================================;
* STEP 2: Merge alternate titles                                               ;
*==============================================================================;

merge 1:1 soc using "${dat}/onet_alt_titles.dta"         ;
tab _merge                                               ;
drop if _merge == 2; drop _merge                         ;


*==============================================================================;
* STEP 3: Merge BLS employment and wages                                       ;
*==============================================================================;

merge 1:1 soc using "${dat}/bls_employment.dta"          ;
tab _merge                                               ;
drop if _merge == 2; drop _merge                         ;

qui sum employment                                       ;
gen employment_share = employment / r(sum)               ;


*==============================================================================;
* STEP 4: Merge all exposure indices                                           ;
*==============================================================================;

* Eloundou and AEI: O*NET 8-digit key
merge 1:1 soc using "${dat}/exposure_eloundou.dta"       ;
tab _merge; drop if _merge == 2; drop _merge             ;

merge 1:1 soc using "${dat}/exposure_aei.dta"            ;
tab _merge; drop if _merge == 2; drop _merge             ;

* Felten, GENOE, Pizzinelli, SML: 6-digit key
* For O*NET sub-codes (e.g., 15-1252.01), try parent .00
gen soc_6dig = substr(soc, 1, 7) + ".00"                 ;

foreach f in "felten" "genoe" "pizzinelli" "sml" {;

    di in red "Merging `f'"                              ;

    merge m:1 soc using "${dat}/exposure_`f'.dta",
        gen(_m1)                                         ;
    drop if _m1 == 2                                     ;

    preserve                                             ;
        use "${dat}/exposure_`f'.dta", clear              ;
        rename soc soc_6dig                              ;
        tempfile parent                                  ;
        save `parent', replace                           ;
    restore                                              ;

    merge m:1 soc_6dig using `parent',
        gen(_m2) update                                  ;
    drop if _m2 == 2                                     ;

    drop _m1 _m2                                         ;
};

drop soc_6dig                                            ;


*==============================================================================;
* STEP 5: Count tasks per occupation                                           ;
*==============================================================================;

preserve                                                 ;
    use "${dat}/onet_tasks.dta", clear                    ;
    collapse (count) task_count = task, by(soc)           ;
    tempfile tcounts                                      ;
    save `tcounts', replace                              ;
restore                                                  ;

merge 1:1 soc using `tcounts'                            ;
drop if _merge == 2; drop _merge                         ;
replace task_count = 0 if missing(task_count)             ;


*==============================================================================;
* STEP 6: Label and save                                                       ;
*==============================================================================;

label var soc              "O*NET-SOC Code"              ;
label var occ_title        "Occupation title"             ;
label var alt_titles       "Alternate titles (pipe-delim)";
label var employment       "BLS total employment (2023)"  ;
label var mean_wage        "BLS annual mean wage"         ;
label var employment_share "Share of total U.S. employment";
label var task_count       "Number of O*NET core tasks"   ;
label var eloundou_alpha   "Eloundou: AI alone"           ;
label var eloundou_beta    "Eloundou: AI + tools"         ;
label var eloundou_gamma   "Eloundou: AI + full system"   ;
label var aei_automation   "AEI: pct tasks w/ automation" ;
label var aei_augmentation "AEI: pct tasks w/ augmentation";
label var aei_mean_automation   "AEI: mean automation"    ;
label var aei_mean_augmentation "AEI: mean augmentation"  ;
label var felten           "Felten: LM-AIOE (0-1)"        ;
label var genoe            "GENOE: 5-year horizon"        ;
label var pizzinelli       "Pizzinelli: C-AIOE (0-1)"     ;
label var sml              "Brynjolfsson: SML (0-1)"      ;

order soc occ_title employment mean_wage employment_share
    task_count eloundou_* aei_* felten genoe pizzinelli
    sml alt_titles                                       ;

sort soc                                                 ;
compress                                                 ;
save "${dat}/occupations_merged.dta", replace             ;

di as result "Final dataset: `=_N' occupations"          ;
describe                                                 ;
