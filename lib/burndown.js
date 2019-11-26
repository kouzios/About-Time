/**
 * Created by kungm on 12/8/2016.
 */
var jira_url='https://msoese.atlassian.net';
function getBurndown(rapidViewId,sprintId){
    downloadbd(jira_url+"rest/greenhopper/1.0/rapid/charts/scopechangeburndownchart?rapidViewId="+rapidViewId+"&sprintId="+sprintId);


}
function downloadbd(url){
    
}