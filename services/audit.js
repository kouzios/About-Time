var audit = {};

/**
 * The purpose of this class is to audit time logs to determine possible mistakes.
 * Current flagged mistakes:
 * - 5+ hours logged in a row
 * - 10+ hours logged in a day
 * - Missing description
 * - Overlapping time logs
 * - Logging time two weeks or more after it was worked
 *
 * The program flow is:
 * 1 - timelogged.js compiles a list of users. Each user has a list of timelogs.
 *     Each timelog is a string separated by ^
 * 2 - After making this user list, timelogged.js calls report_errors on the user list.
 * 3 - audit.js adds two fields to the user: issue and flagged.
 *     flagged ia a boolean, True if there is an issue, False if not.
 *     issue is a string containing HTML list elements for each issue found.
 * 4 - custom.pug reads through this. If the timelog is flagged, it is displayed
 *     in orange and the issue field is sent to custom.js, in a list.
 * 5 - custom.js shows the issue field exactly as it is sent, below the table generated.
 *     This shows as a list with items for each issue.
 *
 * @author griggszm@msoe.edu
 */

// Constants

const SECONDS_TO_MILLIS = 1000;
const SECONDS_PER_HOUR = 3600;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const FLAG_AFTER_HOUR_SINGLE = 5.0; //Number of hours to flag after for a single time log
const FLAG_AFTER_HOUR_DAY = 10.0; //Number of hours to flag after for the total time for the whole day
const FLAG_AFTER_LATE_LOGGING = 7; //Number of days to flag after for a late entry. For example, logging work x days in the past.
const ACCEPTABLE_OVERLAP_IN_MILLI = 300000; //Number of ms that issues can overlap, time-wise

/**
 * Code to get the constants, used in tests
 */

audit.get_seconds_to_millis = function() {
    return SECONDS_TO_MILLIS;
};

audit.get_seconds_per_hour = function() {
    return SECONDS_PER_HOUR;
};

audit.get_milliseconds_per_day = function() {
    return MILLISECONDS_PER_DAY;
};

audit.get_flag_after_hour_single = function() {
    return FLAG_AFTER_HOUR_SINGLE;
};

audit.get_flag_after_hour_day = function() {
    return FLAG_AFTER_HOUR_DAY;
};

audit.get_flag_after_late_logging = function() {
    return FLAG_AFTER_LATE_LOGGING;
};

/**
 * Main controller function to audit the timelogs.
 * This is called after the user array is setup with their worked times.
 *
 * @param users An array of users with worklogs.
 */
audit.report_errors = function (users, tasks) {
    for(user in users) {
        var whichUsers = users[user].dailyTime;
        for(singleDay in whichUsers) {
            var day = whichUsers[singleDay];
            audit.report_errors_single_days(day.worklogs, tasks);
        }
    }
};

/**
 * Audits a single day for possible errors.
 *
 * @param day The single day containing worklogs to audit.
 */
audit.report_errors_single_days = function (day, tasks) {
    if(day.id != "") {
        var finalIssues = "";

        var individualTimes = day.time;
        var individualDescriptions = day.desc;
        var individualCreatedDate = day.created;
        var individualStartedDate = day.started;
        var individualIds = day.id;

        var individualIssues = [];
        audit.report_error_for_log(individualTimes, individualIssues, individualIds, individualDescriptions, individualCreatedDate, individualStartedDate, tasks);

        day.flagged = (individualIssues.length > 0);

        for(var i = 0; i < individualIssues.length; i++) {
            finalIssues += individualIssues[i];
        }
        day.issue = finalIssues;
    }
};

/**
 * Converts a date from Jira into milliseconds.
 *
 * @param date          A date from Jira request.
 * @returns {number}    Millisecond representation of the date.
 */
audit.getTimelogMillis = function (date) {
    var dateLogMade = new Date(date);
    return dateLogMade.getTime();
};

/**
 * Goes through each entry in a timelog and audits the entire timelog as a whole.
 *
 * @param individualTimes           Array containing the time that each logging was worked for.
 * @param individualIssues          Array of issues to add to when an issue is found.
 * @param individualIds             Array containing IDs for which issue the user logged to.
 * @param individualDescriptions    Array containing descriptions for each logging
 * @param individualCreatedDate     Array containing the date when the timelog was created.
 *                                  This is when the user pressed Log Work for this logging.
 * @param individualLoggedToDate    Array containing the time when the work was started. This time
 *                                  can be adjusted from the dialog.
 *
 */
audit.report_error_for_log = function (individualTimes, individualIssues, individualIds, individualDescriptions, individualCreatedDate, individualLoggedToDate, tasks) {
    var next = 0;
    var timesSum = 0;

    for (var i = 0; i < individualTimes.length; i++) {
        timesSum += Number(individualTimes[i]);
        if (audit.audit_over_hours(individualTimes[i])) {
            individualIssues[next++] = audit.make_flagged_text_single_entry(i + 1, individualIds[i], "has " + FLAG_AFTER_HOUR_SINGLE + " or more hours logged in a row.");
        }

        if (audit.audit_blank_description(individualDescriptions[i])) {
            individualIssues[next++] = audit.make_flagged_text_single_entry(i + 1, individualIds[i], "has no description.");
        }

        if(audit.audit_logged_in_the_past(individualCreatedDate[i],individualLoggedToDate[i])) {
            individualIssues[next++] = audit.make_flagged_text_single_entry(i + 1, individualIds[i], "was logged " + FLAG_AFTER_LATE_LOGGING + " or more days late.",
                "Logged to: " + audit.format_date(individualLoggedToDate[i]) + "<br>Created on: " + audit.format_date(individualCreatedDate[i]));
        }

        for(var i2 = 0; i2 < individualTimes.length; i2++) {
            if(i2 != i && audit.audit_overlapping_time(individualTimes[i],individualLoggedToDate[i], individualTimes[i2], individualLoggedToDate[i2])) {
                var message;
                if(audit.audit_complete_overlap(individualTimes[i],individualLoggedToDate[i], individualTimes[i2], individualLoggedToDate[i2])){
                    message = "completely overlap";
                } else {
                    message = "partially overlap";
                }
                individualIssues[next++] = audit.make_flagged_text_two_entries(i + 1, individualIds[i], i2 + 1, individualIds[i2], message,
                    "Entry " + (i+1) + " logged: " + audit.format_date(individualLoggedToDate[i]) + " for " + audit.format_time(individualTimes[i]) + "<br>Entry " + (i2+1) + " logged: " + audit.format_date(individualLoggedToDate[i2])  );
            }
        }
        for(var task in tasks) {
            var task2 = tasks[task];
            if(task2.key == individualIds[i]) {
                if(new Date(task2.created) > new Date(individualLoggedToDate[i])) {
                    individualIssues[next++] = audit.make_flagged_text_single_entry(i + 1, individualIds[i], "was logged before its task was created.",
                        "Date logged: " + audit.format_date(individualLoggedToDate[i])  + "<br>Task created: " + audit.format_date(task2.created));
                }
            }
        }
    }

    if (audit.audit_over_hours_full_day(timesSum)) {
        individualIssues[next++] = audit.make_flagged_text_no_entry("Day has " + FLAG_AFTER_HOUR_DAY + " or more hours logged.");
        
    }
};

/**
 * Formats a date in the given form to a nice string
 *
 * @param date  Date string to parse
 */
audit.format_date = function(date) {
    var d = new Date(date);
    var hours = d.getHours();
    if(hours < 10) {
        hours = "0" + hours;
    }
    var minutes = d.getMinutes();
    if(minutes < 10) {
        minutes = "0" + minutes;
    }
    var amOrPm = "AM";
    if(hours >= 12) {
        hours-=12;
        if(hours==0) {
            hours=12;
        }
        amOrPm = "PM";
    }

    var fullDate = (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear() + " " + hours + ":" + minutes + " " + amOrPm;
    return fullDate;
};

/**
 * Converts seconds into a readable format.
 *
 * @param time  Number of seconds to change to minutes/hours.
 */
audit.format_time = function(time) {
    var seconds = time;
    var minutes = 0;
    var hours = 0;
    while(seconds >= 60) {
        seconds = seconds - 60;
        minutes++;
    }
    while(minutes >= 60) {
        minutes = minutes - 60;
        hours++;
    }
    var time_string = "";
    if(hours > 0) {
        time_string += hours + "h";
    }
    if(minutes > 0) {
        time_string += minutes + "m";
    }
    return time_string;
};

/**
 * Determines how far in the past this was logged.
 * If it is over or equal to the FLAG_AFTER_LATE_LOGGING, then
 * it will return true.
 *
 * @param createdDate   Date from Jira on which this timelog was entered into the system.
 * @param loggedToDate  Date from Jira which this timelog was logged to. This should be before the created date.
 * @returns {boolean}   True if should be flagged; false if not.
 */
audit.audit_logged_in_the_past = function (createdDate, loggedToDate) {
    createdDate = audit.getTimelogMillis(createdDate);
    loggedToDate = audit.getTimelogMillis(loggedToDate);
    var dateDifference = Number(createdDate) - Number(loggedToDate);
    var dateDifferenceDays = dateDifference / MILLISECONDS_PER_DAY;
    return (dateDifferenceDays > FLAG_AFTER_LATE_LOGGING);

};

/**
 * Checks if two time logs are completely overlapping
 *
 * @param timeLogged        The amount of time worked  in the first log (seconds)
 * @param timeLoggedTwo     The amount of time worked in the second log (secondS)
 * @param timeLoggedToOne   The date that the first log was logged to
 * @param timeLoggedToTwo   The date that the second log was logged to
 * @param completeOverlap   If there is a complete overlap in times
 * @returns {boolean}       True if and only if completely overlapping
 * @author kouziosma@msoe.edu
 */
audit.audit_complete_overlap = function(timeLogged, startTimeOne, timeLoggedTwo, startTimeTwo) {
    /* Convert times to ms */
    timeLogged = timeLogged * SECONDS_TO_MILLIS; //How much time was logged in the first log (e.g logged 5 hours)
    timeLoggedTwo = timeLoggedTwo * SECONDS_TO_MILLIS;//How much time was logged in the second log (e.g logged 5 hours)
    startTimeOne = audit.getTimelogMillis(startTimeOne); //The first date object in milliseconds
    startTimeTwo = audit.getTimelogMillis(startTimeTwo); //The second date object in milliseconds

    /* Calculate end times and time differences */
    var endTimeOne = startTimeOne + timeLogged; //End time for first log
    var endTimeTwo = startTimeTwo + timeLoggedTwo; //End time for seocnd log
    var differenceStart = startTimeTwo - startTimeOne; //Checks the difference in time b/w the first and second dates start times (in ms)
    var differenceEnd = endTimeTwo - endTimeOne; //Checks the difference in time b/w the first and second dates end times (in ms)

    //Return if the overlap is a complete overlap (second start is at or after the first start, and at or before the first end)
    return (differenceStart >= 0 && differenceEnd <= 0);
}

/**
 * Determines whether two timelogs overlap.
 *
 * @param timeLogged        The amount of time worked  in the first log (seconds)
 * @param timeLoggedTwo     The amount of time worked in the second log (secondS)
 * @param timeLoggedToOne   The date that the first log was logged to
 * @param timeLoggedToTwo   The date that the second log was logged to
 * @param completeOverlap   If there is a complete overlap in times
 * @returns {boolean}       True if overlapping; false if not.
 * @author griggszm@msoe.edu
 * @author kouziosma@msoe.edu
 */
audit.audit_overlapping_time = function (timeLogged, startTimeOne, timeLoggedTwo, startTimeTwo) {
    /* Convert times to ms */
    timeLogged = timeLogged * SECONDS_TO_MILLIS; //How much time was logged in the first log (e.g logged 5 hours)
    timeLoggedTwo = timeLoggedTwo * SECONDS_TO_MILLIS;//How much time was logged in the second log (e.g logged 5 hours)
    startTimeOne = audit.getTimelogMillis(startTimeOne); //The first date object in milliseconds
    startTimeTwo = audit.getTimelogMillis(startTimeTwo); //The second date object in milliseconds

    //Checks the difference in time between the first and second dates start times (in milliseconds)
    var differenceStart = startTimeTwo - startTimeOne; 

    //Say we have times 1, and 3. Then we have pairs {1,3}, {3,1}. But we only want to test one pair. So we take pair {1,3}.
    if(differenceStart < 0) {
        return false;
    }
    
    var endTimeOne = startTimeOne + timeLogged;
    var endTimeTwo = startTimeTwo + timeLoggedTwo;
    var differenceEnd = endTimeTwo - endTimeOne;

    //If time 2 is entirely inside time 1
    if(differenceStart >= 0 && differenceEnd <= 0) {
        return timeLoggedTwo > ACCEPTABLE_OVERLAP_IN_MILLI; //Then report an overlap if the duration isn't in the acceptable range
    } //If the partial overlap is acceptable
    else if((endTimeOne - startTimeTwo) <= ACCEPTABLE_OVERLAP_IN_MILLI){
        return false; //Then we don't consider it an overlap
    } //Check for overlap as normal
    else {
        return differenceStart < timeLogged;
    }
};

/**
 * Audits a full day to determine whether too many hours were worked that day.
 *
 * @param time          Time worked in seconds
 * @returns {boolean}   True if too much; false if not.
 */
audit.audit_over_hours_full_day = function (time) {
    return(time >= FLAG_AFTER_HOUR_DAY * SECONDS_PER_HOUR);
};

/**
 * Generates HTML text for the flagging to put in the custom.js page.
 *
 * @param entryNum      Entry number to put in the text
 * @param entryId       Entry ID to put in the text
 * @param message       Message showing error to user
 * @returns {string}    HTML list tag containing the mistake
 */
audit.make_flagged_text_single_entry = function (entryNum, entryId, message, child) {
    if(child) {
        return "<div class='tooltip'>Entry #" + entryNum + " " + message + "<br><span class='tooltiptext'>" + child + "</span></div><br><br>";
    }
    return "<div>Entry #" + entryNum + " " + message + "</div><br>";
};

/**
 * Generates HTML text to show the time/date worked for a single entry
 *
 * @param entryNum      Entry number to put in the text
 * @param entryId       Entry ID to put in the text
 * @param message       Message showing error to user
 * @returns {string}    HTML list tag containing the mistake
 */
audit.make_time_text = function (message) {
    return "<div>Entry " + message + "</div><br>";
};

/**
 * Generates HTML text for flagging to put in when two entries conflict
 *
 * @param entryNum      Entry number to put in the text
 * @param entryId       Entry ID to put in the text
 * @param entryNumTwo   First Entry ID to put in the text
 * @param entryIdTwo    Second Entry ID to put in the text
 * @param message       Message showing error to user
 * @returns {string}    HTML list tag containing the mistake
 */
audit.make_flagged_text_two_entries = function (entryNum, entryId, entryNumTwo, entryIdTwo, message, child) {
    if(child) {
        return "<div class='tooltip'>Entry #" + entryNum + " and Entry #" + entryNumTwo + " " + message + "<br><span class='tooltiptext'>" + child + "</span></div><br><br>";
    }
    return "<div>Entry #" + entryNum + " and Entry #" + entryNumTwo + " " + message + "</div><br>";
};

/**
 * Generates HTML text for flagging when it is not related to any entry.
 *
 * @param message       Message showing error to user
 * @returns {string}    HTML list tag containing the mistake
 */
audit.make_flagged_text_no_entry = function (message) {
    return "<div>" + message + "</div><br>";
};

/**
 * Determines whether a single time log is over the allowed hours.
 *
 * @param individualTime    Single time to check
 * @returns {boolean}       True if over hours; false if not.
 */
audit.audit_over_hours = function (individualTime) {
    return(Number(individualTime) >= FLAG_AFTER_HOUR_SINGLE * SECONDS_PER_HOUR);
};

/**
 * Determines whether a single log has an empty description.
 *
 * @param desc          Timelog description
 * @returns {boolean}   True if blank; false if not.
 */
audit.audit_blank_description = function (desc) {
    return(desc == "" || desc == undefined);
};

module.exports = audit;