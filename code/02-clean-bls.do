/*******************************************************************************
* OCCUPATION & AI IMPACT EXPLORER — Clean BLS OES
* Purpose: Import employment and wage data from BLS May 2023
* Input:   rawdata/bls/national_M2023_dl.xlsx
* Output:  data/bls_employment.dta
*******************************************************************************/

#delimit ;
clear all ; set more off ;


*==============================================================================;
* STEP 1: Import and filter to detailed occupations                            ;
*==============================================================================;

import excel "${raw}/bls/national_M2023_dl.xlsx", firstrow clear               ;

* Keep only detailed (non-overlapping) occupation rows
keep if O_GROUP == "detailed"                                                  ;

rename OCC_CODE soc_6dig                                                       ;
rename OCC_TITLE occ_title                                                     ;

* Employment
destring TOT_EMP, gen(employment) ignore(",*")                                 ;

* Mean annual wage (# = top-coded)
destring A_MEAN, gen(mean_wage) ignore(",*#")                                  ;

keep soc_6dig occ_title employment mean_wage                                   ;


*==============================================================================;
* STEP 2: Create O*NET-style SOC code for merging                              ;
*==============================================================================;

* BLS uses XX-XXXX; O*NET uses XX-XXXX.00
gen soc = soc_6dig + ".00"                                                     ;


*==============================================================================;
* STEP 3: Save                                                                 ;
*==============================================================================;

sort soc                                                                       ;
compress                                                                       ;
save "${dat}/bls_employment.dta", replace                                      ;

di as result "BLS occupations: `=_N'"                                          ;
