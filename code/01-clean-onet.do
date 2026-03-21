/*******************************************************************************
* OCCUPATION & AI IMPACT EXPLORER — Clean O*NET 30.2
* Purpose: Import task statements, occupation list, and alternate titles
* Input:   rawdata/onet/Task Statements.xlsx
*          rawdata/onet/Occupation Data.xlsx
*          rawdata/onet/Alternate Titles.xlsx
* Output:  data/onet_tasks.dta
*          data/onet_occupations.dta
*          data/onet_alt_titles.dta
*******************************************************************************/

#delimit;
clear all; set more off;

glo user = lower("`=c(username)'")                       ;
glo root "C:/Users/${user}/Dropbox/Admin/website/occ_exposure" ;
glo raw  "${root}/rawdata"                               ;
glo dat  "${root}/data"                                  ;
glo cod  "${root}/code"                                  ;


*==============================================================================;
* STEP 1: Task Statements                                                      ;
*==============================================================================;

import excel "${raw}/onet/Task Statements.xlsx",
    firstrow clear                                       ;

keep if TaskType == "Core"                               ;
rename ONETSOCCode soc                                   ;
rename Title occ_title                                   ;
rename Task task                                         ;
keep soc occ_title task                                  ;

sort soc task                                            ;
compress                                                 ;
save "${dat}/onet_tasks.dta", replace                    ;

distinct soc                                             ;
di as result
    "Core tasks: `=_N' across `r(ndistinct)' occupations";


*==============================================================================;
* STEP 2: Occupation List                                                      ;
*==============================================================================;

import excel "${raw}/onet/Occupation Data.xlsx",
    firstrow clear                                       ;

rename ONETSOCCode soc                                   ;
rename Title occ_title                                   ;
keep soc occ_title                                       ;
duplicates drop                                          ;

sort soc                                                 ;
compress                                                 ;
save "${dat}/onet_occupations.dta", replace              ;

di as result "Occupations: `=_N'"                        ;


*==============================================================================;
* STEP 3: Alternate Titles                                                     ;
*==============================================================================;

import excel "${raw}/onet/Alternate Titles.xlsx",
    firstrow clear                                       ;

rename ONETSOCCode soc                                   ;
rename AlternateTitle alt_title                          ;
keep soc alt_title                                       ;

sort soc alt_title                                       ;
by soc: gen n = _n                                       ;

* Cap at 15 titles per occupation
drop if n > 15                                           ;

reshape wide alt_title, i(soc) j(n)                     ;

gen alt_titles = ""                                      ;
forvalues i = 1/15 {;
    cap confirm variable alt_title`i'                    ;
    if !_rc {;
        replace alt_titles = alt_titles + " | " + alt_title`i'
            if !missing(alt_title`i') & alt_titles != "" ;
        replace alt_titles = alt_title`i'
            if !missing(alt_title`i') & alt_titles == "" ;
    };
};

keep soc alt_titles                                      ;
sort soc                                                 ;
compress                                                 ;
save "${dat}/onet_alt_titles.dta", replace               ;

di as result "Occupations with alt titles: `=_N'"        ;
