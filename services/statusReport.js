require('dotenv').config();
var statusReport = {};
var _ = require('underscore');
var confluence = require('./confluence.js');
var request = require('./request.js');
var loadup = require('./loadup.js');
var time = require('../lib/time');
var sprintname;
var moment = require('moment');
var jql = require('./jql.js');
var requestLib = require('request');
var Promise = require('promise');
var cheerio = require('cheerio');
requestLib.debug = false;

function createChildPage(req, confluenceKey, name, htmlString){
    return confluence.getOrCreatePage(req, confluenceKey, "Status Reports", 0).then(function(parentResult){
        var parentID = JSON.parse(parentResult).results[0].id; 
        return confluence.getOrCreatePage(req, confluenceKey, name, parentID).then(function(childResult){
            var childID = JSON.parse(parentResult).results[0].id;  
            return confluence.updatePage(req, childResult, name, htmlString, true).then(function () {
                return confluence.getDescendantPages(req, parentID).then(function (childResults) {
                    confluence.updatePage(req, parentResult, "Status Reports", generateParentLinkList(childResults, confluenceKey), true).then(function(){
                        return req.jwt.base_url + "/wiki/spaces/" + confluenceKey + "/pages/" + childID;
                    });
                });
            });
        });
    });
}

function generateParentLinkList(children, confluenceKey) {
    var linkList = '<h1>Reports</h1><ul>';
    _.each(JSON.parse(children).results, function(child) {
        var childID = child.id;
        var childtitle = child.title;
        var baseurl = JSON.parse(children)["_links"].base;
        var url = baseurl + "/spaces/" + confluenceKey + "/pages/" + childID;
        linkList += "<li><a href='" + url + "'>" + childtitle + "</a></li>"
    });
    linkList += '</ul>';
    return linkList;
}

statusReport.createPageContent = function(req, projectKey, project_data, startDate, endDate, name, users, history, burndowndata){
    return loadup.getSpacePages(req, projectKey).then(function (sprint_array) {
        let goal = '';
        for (var count in sprint_array) {
            if (sprint_array[count].sprint.name === sprintname) {
                goal = "<b>Sprint Goal:</b> " + sprint_array[count].sprint.goal;
                break;
            } else {
                goal = "<b>No Sprint Goal</b>";
            }
        }
        var html = "<div>";
        html += '<h2>' + name + ' (' + startDate + ' - ' + endDate + ')</h2>' + goal;
        html += "<br/><div>" + (history['charts'] || "<b>Burndown Charts:</b>") + "</div>";
        html += "<div id='burndown_section' style='height: 500px'></div>";
        
        /* Start Story Point data formatting */
        var key = [];
        var value = [];
        var timedate = [];

        //Get start and end date in proper format
        var start = new Date('1970-01-01T00:00:00.000Z');
        start.setSeconds(start.getSeconds() + (burndowndata.startTime/1000));
        var end = new Date('1970-01-01T00:00:00.000Z');
        end.setSeconds(end.getSeconds() + (burndowndata.endTime/1000));

        //Iterate through each burndown story change, and store the important ones
        for(date in burndowndata.changes) {
            var dateSeconds = date/1000;
            var temp = new Date('1970-01-01T00:00:00.000Z');
            temp.setSeconds(temp.getSeconds() + dateSeconds);
            //The story point change for the date
            for(var i = 0; i < burndowndata.changes[date].length; i++) {
                var content = burndowndata.changes[date][i];
                var done = false;
    
                if(content.statC) {
                    if(content.statC.newValue) {
                        key.push(content.key);
                        value.push(content.statC.newValue);
                        timedate.push(temp);
                        done = true;
                    }
                }
    
                if(content.column && !done) {
                    if(content.column.done == true) {
                        key.push(content.key);
                        value.push(0);
                        timedate.push(temp);
                    }
                }
            }
        }
        
        //Sort arrays by earliest timedate to latest
        // RWH, todo: fix this o(n^2) sort!!
        for (var i = 0; i < timedate.length; i++) {
            for (var j = i+1; j < timedate.length; j++) {
                if ( (timedate[i].getTime() > timedate[j].getTime()) && (i != j) ) {
                    //Move date
                    var temp = timedate[j];
                    timedate[j] = timedate[i];
                    timedate[i] = temp;

                    //Move keys
                    temp = key[j];
                    key[j] = key[i];
                    key[i] = temp;

                    //Move Values
                    temp = value[j];
                    value[j] = value[i];
                    value[i] = temp;
                }
            }
        }

        var burndowndataFormatted = {
            start: start,
            end: end,
            key: key,
            value: value,
            timedate: timedate
        }
        html += '<input type="hidden" id="burndowndataFormatted" name="burndowndataFormatted" value="' + JSON.stringify(burndowndataFormatted).replace(/\"/g, "&quot") + '">';
        /* End Story Point data formatting */

        html += generateTimeTable(users, project_data);
        var promises = [];

        // Iterates through each user and calls createUserSection for all of them
        //createUserSection is the section of the report that has the username and worklogs
        var user_array = [];
        for(var user in users){
            user_array.push(user);
        }
        user_array.sort();
        _.each(user_array, function(user) {
            promises.push(createUserSection(req, users[user], projectKey, startDate, endDate, history));
        });

        return Promise.all(promises).then(function (values) {
            _.each(values, function (val) {
                html += val;
            });
            html += "<div class='abouttime-keep-section'>"
                + "<br/><b>Discussion:</b>"
                + "<br/><b>Questions for Advisor:</b>"
                + "<br/><b>Questions for PO:</b>"
                + "<br/><b>Conclusion:</b>"
                + "</div>"
                + "</div>";
            return html;
        });
    });
};

statusReport.makeReport = function (req, projectKey, confluenceKey, startDate, endDate, name, project_data, preview, burndowndata) {
    var users = project_data.user_array;
    if(preview && (!confluenceKey || confluenceKey === 'Select a Space')) {

        return statusReport.createPageContent(req, projectKey, project_data.task_array, startDate, endDate, name, users, {}, burndowndata).then(function (htmlString) {
            return htmlString;
        });
    }
    return findPageKey(req, confluenceKey, name).then(function (pageKey) {
        var pagePromise = new Promise(function (resolve, reject) {
            return resolve({});
        });
        if (parseInt(pageKey) !== -2) {
            pagePromise = confluence.getPageContent(req, confluenceKey, name).then(function (pageContent) {
                return new Promise(function(resolve){ return resolve(statusReport.getSectionHistory(JSON.parse(pageContent)['results'][0]['body']['view']['value'])); });
            });
        }
        return pagePromise.then(function (history) {
            return statusReport.createPageContent(req, projectKey, project_data.task_array, startDate, endDate, name, users, history, burndowndata).then(function (htmlString) {
                if (preview === 'true') {
                    return htmlString;
                } else {
                    return statusReport.sendReport(req, confluenceKey, name, htmlString);
                }
            });
        });
    });
};

/**
 * sends the report to confluence to be made into a page if the page doesn't exist
 * @author jacksonbrant@msoe.edu
 * @param req
 * @param confluenceKey
 * @param name is the title of the status report
 * @param html is the HTML of the status report to be sent to confluence
 * @returns {Thenable<never | T> | ThenPromise<never | T>}
 */
statusReport.sendReport = function (req, confluenceKey, name, html) {
    return createChildPage(req, confluenceKey, name, html).then(function () {
        return findPageKey(req,confluenceKey,name).then(function(childID){
            return req.jwt.base_url+"/wiki/spaces/" + confluenceKey + "/pages/" + childID;
        })
    });
};

statusReport.getSectionHistory = function(documentHTML){
    var $ = cheerio.load(documentHTML);
    var history = {};
    $('.abouttime-keep-section').each(function(index, element){
        var $e = $(element);
        if($e.hasClass('user-section')){
            var username = $e.attr('class').split(' ')[2];
            history[username] = history[username] || '';
            history[username] += $e.html();
        } else if ($e.hasClass('user-rating')) {
            var username = $e.attr('class').split(' ')[2];
            history['userRating'] = history['userRating'] || {};
            history['userRating'][username] = history['userRating'][username] || '';
            history['userRating'][username] += $e.html();
        } else if ($e.hasClass('burndown-charts')) {
            history['charts'] = history['charts'] || '';
            history['charts'] += $e.html();
        } else {
            history['end'] = history['end'] || '';
            history['end'] += $e.html();
        }
    });
    closeUnclosedTags(history);
    return history;
};

function closeUnclosedTags(history){
    for(var thing of Object.keys(history)){
        if(typeof history[thing] === typeof {})
            closeUnclosedTags(history[thing]);
        else
            history[thing] = history[thing].replace(/<(img|hr|br)(.*?)\/?>(<\/(img|hr|br)>)?/g, '<$1$2></$1>');
    }
}

/**
 * createUserSection creates the section of the report that has the username and worklogs
 * This includes everything below the burndown chart table
 * @param req
 * @param user
 * @param projectKey
 * @param startDate
 * @param endDate
 */
function createUserSection(req, user, projectKey, startDate, endDate, history) {
    var html = getWorklogbyIssueTypes(req, projectKey,user.name, startDate, endDate).then(function (results) {
        var userHtml = "<b style=\"font-size: 20px;\">" + user.name + "</b><br/>";
        userHtml += "<b>Work Logs:</b>";
        userHtml += "<p>" + results + "</p>";
        userHtml += "<div class='abouttime-keep-section user-section " + user.name + "'>";
        userHtml += history[user.name] || "<b>Comments:</b><hr/>";
        userHtml += "</div>";
        return userHtml;
    });
    return html;
}

function getWorklogbyIssueTypes(req,project,username,startDate,endDate) {
    var finalliststring = "";// the final html string for individual user
    //get the html code for story
    return populateIssueWorklog(req, project, username, startDate, endDate, "Story").then(function (storyresults) {
        if (storyresults !== "") {//if there is worklog for tasks under story or directly logged for story
            finalliststring = "<p style=\"margin-left: 20px\"><b>Story</b></p>";
            finalliststring += storyresults ;
        }
        //for bug
        return populateIssueWorklog(req, project, username, startDate, endDate, "Bug/Defect").then(function (bugresults) {
            if (bugresults !== "") {
                finalliststring += "<p style=\"margin-left: 20px\"><b>Bug/Defect</b></p>"+bugresults ;
            }
            //for knowledge acquisition
            return populateIssueWorklog(req, project, username, startDate, endDate, "Knowledge Acquisition").then(function (KAresults) {
                if (KAresults !== "") {
                    finalliststring +=  "<p style=\"margin-left: 20px\"><b>Knowledge Acquisition</b></p>"+ KAresults ;
                }
                //for Internal Improvement
                return populateIssueWorklog(req, project, username, startDate, endDate, "Internal Improvement").then(function (IIresults) {
                    if (IIresults !== "") {
                        finalliststring += "<p style=\"margin-left: 20px\"><b>Internal Improvement</b></p>"+IIresults  ;
                    }
                    //for overhead
                    return populateIssueWorklog(req, project, username, startDate, endDate, "Overhead").then(function (OHresults) {
                        if (OHresults !== "") {
                            finalliststring +="<p style=\"margin-left: 20px\"><b>Overhead</b></p>"+ OHresults;
                        }
                        return finalliststring;
                    })
                })
            })
        })
    })
}
function populateIssueWorklog(req,project,username,startDate,endDate,issueType){
    var finalListString = "";// the final return string
    return getIssue(req, project,issueType).then(function (issueArray)
    {
        return getSubTask(req, project,true).then(function (developmentArray)
        {
            return getSubTask(req,project,false).then(function(nondevArray)
            {
                for (var i = 0; i < issueArray.length; i++) {
                    listString = "";
                    var issueString="";//the string for worklogs that are logged to issue
                    //the html string with the image icon but it doesn't work for reason
                    var issueDescription = '<p style="margin-left: 30px"><a href="' + req.jwt.base_url + "/browse/" + issueArray[i].key + '">' + issueArray[i].key +"</a> " + _.escape(issueArray[i].summary) + " - Current Status: <b>" + issueArray[i].status + " </b></p>";
                    var issuenumLog=0;
                    for (var x = 0; x < issueArray[i].worklogs.worklogs.length; x++) {//if there is worklog logged directly to the issue
                        if (issueArray[i].worklogs.worklogs[x].author.displayName === username) {//check if it is from our user
                            if (time.isBetween(startDate, endDate, issueArray[i].worklogs.worklogs[x].started)) {//check for the time
                                issueString += "<li>Time Spent: " + issueArray[i].worklogs.worklogs[x].timeSpent + " - " + issueArray[i].worklogs.worklogs[x].comment + "</li>";
                                issuenumLog++;
                            }
                        }
                    }
                    if(issuenumLog>0){
                        listString+="<ul style=\"margin-left: 40px\">"+issueString+"</ul>";//check if there is worklog to the issue. If there is, appened the string
                    }
                    var tasklog=false; //if there is worklog to the task
                    var devstring="<ul style=\"margin-left: 40px\">";
                    _.each(developmentArray, function (devtask) {
                        var devtaskLog=0;
                        if (devtask.parent === issueArray[i].id) {//check which issue it belongs to
                            var devtaskString="";

                            devtaskString += '<li><a href="' + req.jwt.base_url + "/browse/" + devtask.key + '">' + devtask.key + '</a> ' + _.escape(devtask.summary) + ' - Current Status: <b>' + devtask.status + "</b></li>";
                            devtaskString += "<ul>";
                            for (var x = 0; x <devtask.worklogs.worklogs.length; x++) {
                                if (devtask.worklogs.worklogs[x].author.displayName === username) {
                                    if (time.isBetween(startDate, endDate, devtask.worklogs.worklogs[x].started)) {
                                        devtaskString += "<li>Time Spent: " + devtask.worklogs.worklogs[x].timeSpent + " - " + _.escape(devtask.worklogs.worklogs[x].comment) + "</li>";
                                        devtaskLog++;
                                    }
                                }
                            }
                            devtaskString += "</ul>";
                        }
                        if(devtaskLog>0){//add it to the string if there is a worklog for the task
                            tasklog=true;
                            devstring+=devtaskString;
                        }
                    });
                    devstring += "</ul>";
                    if(devstring!=="<ul style=\"margin-left: 40px\"></ul>"){//add it to the final return string if there is a worklog for developement task
                        listString+=devstring;
                    }
                    //for non-development task
                    var ndevstring = "<ul style=\"margin-left: 40px\">";
                    _.each(nondevArray, function (nondevtask) {
                        var ndevtaskLog=0;
                        if (nondevtask.parent === issueArray[i].id) {
                            var ndevtaskString="";

                            ndevtaskString += '<li><a href="' + req.jwt.base_url + "/browse/" + nondevtask.key + '">' + nondevtask.key + '</a> ' + _.escape(nondevtask.summary) + ' - Current Status: <b>' + nondevtask.status + "</b></li>";
                            ndevtaskString += "<ul>";
                            for (var x = 0; x <nondevtask.worklogs.worklogs.length; x++) {
                                if (nondevtask.worklogs.worklogs[x].author.displayName === username) {
                                    if (time.isBetween(startDate, endDate, nondevtask.worklogs.worklogs[x].started)) {
                                        ndevtaskString += "<li>Time Spent: " + nondevtask.worklogs.worklogs[x].timeSpent + " - " + _.escape(nondevtask.worklogs.worklogs[x].comment) + "</li>";
                                        ndevtaskLog++;
                                    }
                                }

                            }
                            ndevtaskString+= "</ul>";
                        }
                        if(ndevtaskLog>0){
                            tasklog=true;
                            ndevstring+=ndevtaskString;
                        }
                    });
                    ndevstring += "</ul>";
                    if(ndevstring!=="<ul style=\"margin-left: 40px\"></ul>"){
                        listString+=ndevstring;
                    }
                    //if there is a log to the sub-task, add it under the description for the issue
                    if(tasklog===true ||issuenumLog>0){
                        listString=issueDescription+listString;
                    }
                    finalListString += listString;
                }
                return finalListString;
            })
        })
    })
}

/**
 * Checks for projects with 'ceremonies' in the title, and if there's one returns the id - if not
 * returns -1 to indicate failure.
 */
function checkCeremonies(data) {
    var ceremonies = [];
    for(entry in data) {
        var title = data[entry].summary;
        title = title.toLowerCase();
        //If the title has ceremony or ceremonies in it
        if(title.match(/ceremony/g) || title.match(/ceremonies/g)) {
            ceremonies.push(data[entry].key);
        }
    }

    //If only one ceremony, then return it - else return nothing as we are not confident we have the right ceremony.
    if(ceremonies.length == 1) {
        return ceremonies[0];
    } else {
        return -1;
    }
}

/**
 * Converts the time following format of 42.50 is 42 mins and 50/100th of an hour
 * 
 * @param timeSpent The timespent in format defined above
 */
function timeSpentToSeconds(hours) {
    //Converts hours to seconds
    return (hours * 60 * 60); 
}

/**
 * Formats the time to the desired format of 44.50 being 44 hours, 50 minutes
 * 
 * @param {*} time The time in seconds
 * @author Tripp Horbinski
 */
function formattedTime(time) {
    var t = time/3600;
    if (time%3600 === 0)
        t = t.toFixed(0);
    else
        t = t.toFixed(2);
    return t;
}

/**
 * Generates a time table with headings required for the status reports
 * 
 * @param {} users 
 */
function generateTimeTable(users, project_data) {
    var ceremony = checkCeremonies(project_data);
    var html = "<table id='previewTable'>"
    + "<tr><th style='color: black;background-color: transparent !important'>Team Member</th>"
    + "<th style='color: black;background-color: transparent !important'>On-Task Hours</th>"
    + "<th style='color: black;background-color: transparent !important'>Ceremonies</th>"
    + "<th style='color: black;background-color: transparent !important'>Total Hours</th>"
    + "<th style='color: black;background-color: transparent !important'>Discussion</th></tr>";

    //For each user
    for(user in users) {
        var ontask_times = 0;
        var ceremony_times = 0;
        var totalTimeSeconds = timeSpentToSeconds(users[user].totalTime);
        var totalTime = users[user].totalTime;
        //If only one PBI has ceremony in the name
        if(ceremony != -1) {
            //For each day they worked
            for(day in users[user].dailyTime) {
                //For every worklog
                for(var i = 0; i < users[user].dailyTime[day].worklogs.id.length; i++) {
                    if(users[user].dailyTime[day].worklogs.id[i] == ceremony) {
                        ceremony_times += users[user].dailyTime[day].worklogs.time[i];
                    }
                }
                
            }
            ontask_times = totalTimeSeconds - ceremony_times;
        }
       
        html += "<tr>"
        + "<td>" + user + "</td>"
        + "<td>" + formattedTime(ontask_times) + "</td>"
        + "<td>" + formattedTime(ceremony_times) + "</td>"
        + "<td>" + totalTime + "</td>"
        + "<td>" + "" + "</td>"
        + "</tr>";
    }
    html += "</table><br/><hr/>";
    return html;
}

function findPageKey(req, confluenceKey, pageName) {
    return confluence.getKeys(req, confluenceKey).then(function (results) {
        try {
            var result = JSON.parse(results).page.results;
            var parent_key = _.findWhere(result, {title: pageName});
            if (parent_key){
                return parent_key.id;
            }else{
                return -2;
            }
        } catch (error) {
            console.log("there was an error in findPageKey");
            console.log(error);
        }
    })
}

statusReport.getSpaces = function(req){
    return confluence.getKeys(req).then(function (results) {
        return JSON.parse(results);
    })
};

statusReport.createNameAndGetStartAndEndData = function (req, confluenceKey) {
    sprintname = req.body.sprint;
    var sprint_array = loadup.getSprintArray();
    var startdate;
    var enddate;
    for (var count in sprint_array) {
        if (sprint_array[count].sprint.name === sprintname) {
            startdate = sprint_array[count].sprint.startDate;
            enddate = sprint_array[count].sprint.endDate;
        }
    }
    var start = moment(startdate.substring(0, 10));
    var end = moment(enddate.substring(0, 10));
    return {
        name: sprintname + ' Report',
        start: time.format(start),
        end: time.format(end)
    }
};

function getIssue(req, project,issueType) {
    return jql.search(req, 'project=' + project + ' AND issueType = "'+issueType+'"', {fields: ["worklog", "subtasks", "status", "summary","issuetype"]}).then(function (results) {
        return _.map(results.issues, function (e) {
            for(let i = 0; i < e.fields.worklog.worklogs.length || 0; i++) {
                e.fields.worklog.worklogs[i].comment = _.escape(e.fields.worklog.worklogs[i].comment);
                e.fields.worklog.worklogs[i].summary = _.escape(e.fields.worklog.worklogs[i].summary);
            }
            return {
                id: e.id,
                status: e.fields.status.name,
                summary: e.fields.summary,
                key: e.key,
                worklogs: e.fields.worklog,
                icon:e.fields.issuetype.iconUrl
            }
        });
    });
}

function getSubTask(req, project,development) {
    if(development) {
        return jql.search(req, 'project=' + project + ' AND issueType = "Development task"', {fields: ["worklog", "parent", "status", "summary","issuetype"]}).then(function (results) {

            return _.map(results.issues, function (e) {
                return {
                    id: e.id,
                    status: e.fields.status.name,
                    summary: e.fields.summary,
                    parent: e.fields.parent.id,
                    key: e.key,
                    worklogs: e.fields.worklog
                }
            });
        });
    }else{
        return jql.search(req, 'project=' + project + ' AND issueType = "Non-Development task" ', {fields: ["worklog", "parent", "status", "summary","issuetype"]}).then(function (results) {

            return _.map(results.issues, function (e) {
                return {
                    id: e.id,
                    status: e.fields.status.name,
                    summary: e.fields.summary,
                    parent: e.fields.parent.id,
                    key: e.key,
                    worklogs: e.fields.worklog
                }
            });
        });
    }
}

module.exports = statusReport;
