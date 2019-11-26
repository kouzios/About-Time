require('dotenv').config();
var timelogged = {};
var issues = require('./issues.js');
var _ = require('underscore');
var time = require('../lib/time');
var moment = require('moment');
var request = require("./request.js");
var user_array;
var task_array;
var sorted_usernames;
var overheadID = [];


/**
 * Calculates time worked on all tasks within a date range for a project.
 * @param {string} project Project being queried.
 * @param {moment} startdate An arbitrary date to start at.
 * @param {moment} enddate An arbitrary date to end at.
 **/
timelogged.getTasks = function (req, project, startdate, enddate) {
    return issues.query(req, project, startdate, enddate).then(function (results) {
        task_array = _.map(results.issues, function (e) {
            return {
                id: e.id,
                status: e.fields.status.name,
                summary: e.fields.summary,
                created: e.fields.created,
                timespent: convertSecondsToHourMinuteFormat(e.fields.timespent),
                seconds: formatHours(e.fields.timespent),
                key: e.key,
                worklog: null,
                issuetype: e.fields.issuetype.name
            }
        });

        return updateTaskArrayWorklog(req, startdate, enddate, project).then(function () {
            return {
                task_array: task_array,
                user_array: user_array,
                sorted_usernames: sorted_usernames,
                totalDays: time.getTotalDays(enddate, startdate)
            }
        });
    }).catch(function (err) {
        console.log(err);
        console.log(err.stack)
    })
};

/**
 * Calculates time worked on all tasks within a date range for a project.
 * @param {string} project Project being queried.
 * @param {moment} startdate An arbitrary date to start at.
 * @param {moment} enddate An arbitrary date to end at.
 *
 * @author griggszm@msoe.edu
 *
 * TODO: This will have a problem if there are more than 100 subtasks pulled back. There does not seem to be any easy way to get it to pull back more.
 **/
timelogged.getTasksAll = function (req, projs, startdate, enddate) {
    var fullQueryString = "(";
    // This query gets all issues for all requested projects.
    for (var i = 0; i < projs.length; i++) {
        var name = (projs[i].split(",")[1]);
        fullQueryString += "PROJECT = '" + name + "' OR ";
    }
    fullQueryString = fullQueryString.substring(0, fullQueryString.length - 4) + ")";

    return issues.queryMultiple(req, fullQueryString, startdate, enddate).then(function (results) {
        task_array = _.map(results.issues, function (e) {
            return {
                id: e.id,
                status: e.fields.status.name,
                summary: e.fields.summary,
                created: e.fields.created,
                timespent: convertSecondsToHourMinuteFormat(e.fields.timespent),
                seconds: formatHours(e.fields.timespent),
                key: e.key,
                worklog: null,
                issuetype: e.fields.issuetype.name
            }
        });

        return updateTaskArrayWorklog(req, startdate, enddate, "").then(function () {
            return {
                task_array: task_array,
                user_array: user_array,
                sorted_usernames: sorted_usernames,
                totalDays: time.getTotalDays(enddate, startdate)
            }
        });
    });
};

/**
 * Generates user_array contents.
 * @param {array} task_array Tasks in given range.
 * @param {moment} startdate An arbitrary date to start at.
 * @param {moment} enddate An arbitrary date to end at.
 **/
function generateUserArray( req,startdate, enddate,project) {
    return _.chain(task_array)
        .map(function(e) {
            var worklogs = e.worklog.worklogs;
            //sumaries holds the name of a PBI and the issue id of that issue
            var summaries = [];
            summaries[0] = e.summary;
            summaries[1] = e.id;
            //Determines whether or not the next iteration of the for each includes an id for overhead/ceremonies
            let nextID = false;
            _.each(summaries, function(summary) {
                if (nextID === true){
                    overheadID.push(parseInt(summary));
                    nextID = false;
                }
                if (summary.toUpperCase() === 'Ceremonies'.toUpperCase()
                    || summary.toUpperCase() === 'Overhead'.toUpperCase() ) {
                    nextID = true;
                }
            });
            _.each(worklogs, function (worklog) {
                worklog['issuetype'] = e.issuetype;
            });
            return worklogs;
        }).flatten()
        //acc -> The accumelated value
        //e -> the worklogs in each task array
        .reduce(function(acc, e) {
            if(!acc[e.author.displayName]) {
                var currentDate = moment(new Date(startdate.replace(/-/g, '/')));
                var end = moment(new Date(enddate.replace(/-/g, '/')));
                var daysBetween = end.diff(currentDate, 'days') + 1;
                //create a new author if they do not exist yet in the accumelation
                acc[e.author.displayName] = {
                    name: e.author.displayName,
                    avatarUrls: e.author.avatarUrls,
                    totalTime: 0,
                    overheadTime: 0,
                    dailyTime: _.chain(daysBetween)
                        .times(function() {
                            var retVal = {
                                date: time.format(currentDate),
                                timeSpent: 0,
                                timeSpentSeconds: 0,
                                desc: time.getDay(currentDate) + '\n' + time.formatDay(currentDate).substring(0,1),
                                endOfWeek: {
                                    weekTime: 0,
                                    week: time.getEndOfWeek(currentDate)
                                },
                                url: "",
                                worklogs: {
                                    id: "",
                                    time: "",
                                    desc: ""
                                }
                            }
                            currentDate.add(1, 'days');
                            return retVal;
                        })
                        .reduce(function(acc, e) {
                            acc[e.date] = e;
                            return acc;
                        }, {}).value(),
                };
            }
            if(time.isBetween(startdate, enddate, e.started)) {
                acc[e.author.displayName].dailyTime[time.format(e.started)].timeSpent += e.timeSpentSeconds;
                acc[e.author.displayName].dailyTime[time.format(e.started)].timeSpentSeconds += e.timeSpentSeconds;
                acc[e.author.displayName].totalTime += e.timeSpentSeconds;
                //check to see if the issue is ceremonies or overhead
                if(overheadID.indexOf(parseInt(e.issueId)) != -1){
                    acc[e.author.displayName].overheadTime += e.timeSpentSeconds;
                }
                acc[e.author.displayName].dailyTime[time.format(e.started)].endOfWeek.weekTime += e.timeSpentSeconds;
                _.each(task_array, function(task) {
                    if (task.id === e.issueId) {

                        if(acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.created == undefined) {
                            acc[e.author.displayName].dailyTime[time.format(e.started)].url = [];
                            acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.id = [];
                            acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.time = [];
                            acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.desc = [];
                            acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.created = [];
                            acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.started = [];
                        }

                        acc[e.author.displayName].dailyTime[time.format(e.started)].url.push(req.jwt.base_url + "/browse/" + task.key);
                        acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.id.push(task.key);
                        acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.time.push(e.timeSpentSeconds);
                        acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.desc.push(e.comment);
                        acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.created.push(e.created);
                        acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.started.push(e.started);
                        acc[e.author.displayName].dailyTime[time.format(e.started)].worklogs.entries = acc[e.author.displayName].dailyTime[time.format(e.started)].url.length;
                    }
                })

            }
            return acc;
        }, {}).each(function(e) {
            e.totalTime = formatHours(e.totalTime);
            e.overheadTime = formatHours(e.overheadTime);
            _.each(e.dailyTime, function(day) {
                day.timeSpent = formatHours(day.timeSpent);
            })
        }).value();
}



/**
 * Updates the individual worklogs for each task to
 * correct a bug where updating the worklog for a
 * previous day returned the worklog date for the current
 * day and not the previous day.
 * Example: log time on a Thursday for work done on Tuesday
 *          credited Thursday with Tuesday's work time.
 * @param {array} task_array Tasks in given range.
 * @param {moment} startdate An arbitrary date to start at.
 * @param {moment} enddate An arbitrary date to end at.
 **/
function updateTaskArrayWorklog(req, startdate, enddate, project) {
    var promises = _.map(task_array, function (e) {
        return request.postnoJQLrequest(req, e.key, null, null);
    });
    return Promise.all(promises).then(function (values) {
        var array = [];
        var i = 0;
        _.each(values, function (e) {
            array[i++] = JSON.parse(e);
            //console.log(e);
        });
        for (i = 0; i < array.length; i++) {
            _.each(task_array, function (task) {
                if (task.id === array[i].worklogs[0].issueId) {

                    task.worklog = array[i];
                }
            })
        }
        user_array = generateUserArray(req, startdate, enddate, project);
        sorted_usernames = Object.keys(user_array);
        sorted_usernames.sort();
    });
    //, reason => {
    //   console.log(reason)
    // });
}

/**
 * Formats seconds into hours.
 * @param {int} time Time in seconds.
 * @return {double} Time in hours.
 **/
function formatHours(time) {
    var hours = time / 3600;
    if (Math.round(hours) !== hours)
        hours = hours.toFixed(2);
    return hours;
}

/**
 * Converts seconds to an hour and minute String.
 * @param {int} Time in seconds.
 * @return {String} String in 'Xh Xm', 'Xh', or 'Xm' format.
 **/
function convertSecondsToHourMinuteFormat(seconds) {
    var time_string = "";
    var hour;
    var minute;
    hour = Math.trunc((seconds / 3600)); // hour as int
    if (hour > 0) {
        minute = Math.trunc((seconds - (hour * 3600)) / 60); // minute as int
        if (minute > 0)
            time_string = hour + "h " + minute + "m";
        else
            time_string = hour + "h";
    } else {
        minute = Math.trunc(seconds / 60);
        time_string = minute + "m";
    }
    return time_string;
}

module.exports = timelogged;