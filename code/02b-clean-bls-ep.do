/*******************************************************************************
* OCCUPATION & AI IMPACT EXPLORER - Clean BLS Employment Projections
* Purpose: Import 2024-34 occupational projections (Table 1.2)
* Input:   rawdata/bls_ep/occupation.xlsx, sheet "Table 1.2"
* Output:  data/bls_ep.dta
*******************************************************************************/

#delimit;
clear all; set more off;

glo user = lower("`=c(username)'")                       ;
glo root "C:/Users/${user}/Dropbox/Admin/website/occ_exposure" ;
glo raw  "${root}/rawdata"                               ;
glo dat  "${root}/data"                                  ;


*==============================================================================;
* STEP 1: Import Table 1.2                                                     ;
*==============================================================================;

* Skip rows 1-2 (title + header) and start at row 3.                          ;
* Rename by column letter to avoid fragile firstrow-truncation issues.         ;
import excel "${raw}/bls_ep/occupation.xlsx",
    sheet("Table 1.2") cellrange(A3) clear               ;

rename A occ_title                                       ;
rename B soc_6dig                                        ;
rename C occ_type                                        ;
rename D emp_2024                                        ;
rename E emp_2034                                        ;
rename H emp_change_num                                  ;
rename I emp_change_pct                                  ;
rename K annual_openings                                 ;
rename M entry_education                                 ;
rename O ojt                                             ;

keep if occ_type == "Line item"                          ;

* Numeric coercion (Excel may yield strings due to footnote markers)            ;
foreach v in emp_2024 emp_2034 emp_change_num emp_change_pct annual_openings {;
    cap destring `v', replace ignore(",*#")              ;
};


*==============================================================================;
* STEP 2: O*NET-style SOC key                                                  ;
*==============================================================================;

gen soc = soc_6dig + ".00"                               ;

keep soc soc_6dig emp_2024 emp_2034 emp_change_num
    emp_change_pct annual_openings entry_education ojt   ;


*==============================================================================;
* STEP 3: Label and save                                                       ;
*==============================================================================;

label var soc              "O*NET-SOC code"               ;
label var soc_6dig         "BLS 6-digit SOC code"          ;
label var emp_2024         "Employment, 2024 (000s)"       ;
label var emp_2034         "Projected employment, 2034 (000s)" ;
label var emp_change_num   "Projected change, 2024-34 (000s)"  ;
label var emp_change_pct   "Projected change, 2024-34 (%)" ;
label var annual_openings  "Annual avg occupational openings, 2024-34 (000s)" ;
label var entry_education  "Typical entry education"       ;
label var ojt              "Typical on-the-job training"   ;

sort soc                                                 ;
compress                                                 ;
save "${dat}/bls_ep.dta", replace                        ;

di as result "BLS EP occupations: `=_N'"                 ;
