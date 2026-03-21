/*******************************************************************************
* OCCUPATION & AI IMPACT EXPLORER — Clean BLS OES
* Purpose: Import employment and wage data from BLS May 2024
* Input:   rawdata/bls/national_M2024_dl.xlsx
* Output:  data/bls_employment.dta
*******************************************************************************/

#delimit;
clear all; set more off;

glo user = lower("`=c(username)'")                       ;
glo root "C:/Users/${user}/Dropbox/Admin/website/occ_exposure" ;
glo raw  "${root}/rawdata"                               ;
glo dat  "${root}/data"                                  ;
glo cod  "${root}/code"                                  ;


*==============================================================================;
* STEP 1: Import and filter to detailed occupations                            ;
*==============================================================================;

import excel "${raw}/bls/national_M2024_dl.xlsx",
    firstrow clear                                       ;

keep if O_GROUP == "detailed"                            ;

rename OCC_CODE soc_6dig                                 ;
rename OCC_TITLE occ_title                               ;

destring TOT_EMP, gen(employment) ignore(",*")           ;
destring A_MEAN,  gen(mean_wage)  ignore(",*#")          ;

keep soc_6dig occ_title employment mean_wage             ;


*==============================================================================;
* STEP 2: Create O*NET-style SOC code for merging                              ;
*==============================================================================;

gen soc = soc_6dig + ".00"                               ;


*==============================================================================;
* STEP 3: Save                                                                 ;
*==============================================================================;

sort soc                                                 ;
compress                                                 ;
save "${dat}/bls_employment.dta", replace                ;

di as result "BLS occupations: `=_N'"                    ;
