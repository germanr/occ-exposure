/*******************************************************************************
* OCCUPATION & AI IMPACT EXPLORER - Master Do-File
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

* Pre-process: AEI raw data + resolve Pizzinelli Excel formulas
shell python "${cod}/process-aei.py"                     ;
shell python -c "import openpyxl,csv; wb=openpyxl.load_workbook('${raw}/exposure/pizzinelli_caioe.xlsx',data_only=True); ws=wb['data_US_SOC2010']; w=csv.writer(open('${raw}/exposure/pizzinelli_caioe_clean.csv','w',newline='')); [w.writerow(r) for r in ws.iter_rows(values_only=True)]; wb.close()" ;

do "${cod}/01-clean-onet.do"                             ;
do "${cod}/02-clean-bls.do"                              ;
do "${cod}/03-clean-exposure.do"                         ;
do "${cod}/04-merge-all.do"                              ;

* Export to JSON (Stata cannot write JSON natively)
shell python "${cod}/05-export-json.py"                  ;
