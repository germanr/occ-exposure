/*******************************************************************************
* OCCUPATION & AI IMPACT EXPLORER — Master Do-File
* Purpose: Build website data from raw sources
*          rawdata/ → code/ → data/ → src/ (JSON for website)
* Requirements: Stata 18+, Python 3 (pandas, openpyxl)
*******************************************************************************/

#delimit;
clear all; set more off;

glo user = lower("`=c(username)'")                       ;
glo root "C:/Users/${user}/Dropbox/Admin/website/occ_exposure" ;
glo raw  "${root}/rawdata"                               ;
glo dat  "${root}/data"                                  ;
glo cod  "${root}/code"                                  ;
glo src  "${root}/src"                                   ;

cap mkdir "${dat}"                                       ;


*==============================================================================;
* PIPELINE                                                                     ;
*==============================================================================;

* Process AEI raw data from HuggingFace into occupation-level CSV
shell python "${cod}/process-aei.py"                     ;

include "${cod}/01-clean-onet.do"                        ;
include "${cod}/02-clean-bls.do"                         ;
include "${cod}/03-clean-exposure.do"                    ;
include "${cod}/04-merge-all.do"                         ;

* Export to JSON (Stata cannot write JSON natively)
shell python "${cod}/05-export-json.py"                  ;
