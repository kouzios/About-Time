var filtertime = {};

/**
 * This is called in index.js before auditing time logs.
 * The purpose of this is to remove time logs that are outside the date range of the sprint.
 *
 * @author griggszm@msoe.edu
 */

/**
 * Determines whether a time is within the start/end times.
 * Must be passed Date objects.
 */
filtertime.isTimeInDateRange = function(time, start, end) {
    start.setSeconds(0);
    start.setMilliseconds(0);
    end.setSeconds(0);
    end.setMilliseconds(0);
    time.setSeconds(0);
    time.setMilliseconds(0);
    return start <= time && time <= end;
};

/**
 * After removing the time from the amount a user
 * has worked, it also must be removed from the task
 * array which tracks the work done per task.
 */
filtertime.removeEntryFromTasks = function(array, key, startedTime) {
    for(x in array) {
        var entry = array[x];
        var id = entry['key'];
        if(id == key) {
            var worklogs = entry['worklog'];
            var worklogs2 = worklogs['worklogs'];
            for(var i = 0; i < worklogs2.length; i++) {
                var singleLog = worklogs2[i];
                if(singleLog['started'] == startedTime+"^") {
                    worklogs2.splice(i,1);
                    break;
                }
            }
        }
    }
};

/**
 * Deletes entry #num out of an array of worklogs for a day for a user
 * and worklogs per task. Also adjusts the total time worked to decrease
 * the amount that does not count for this sprint.
 */
filtertime.removeSingleEntry = function(day, tasks, num, correction) {
    num = num - correction;
    var worklogs = day["worklogs"];
    var created = worklogs["created"];
    var desc = worklogs["desc"];
    var id = worklogs["id"];
    var started = worklogs["started"];
    var time = worklogs["time"];
    var url = day['url'];
    filtertime.removeEntryFromTasks(tasks, id[num], started[num]);
    var thisTime = Number(time[num]);
    var timeSpent;
    var timeSpentSeconds = day['timeSpentSeconds'];
    timeSpentSeconds = timeSpentSeconds - thisTime;
    day['timeSpentSeconds'] = timeSpentSeconds;
    timeSpentSeconds = Math.round((timeSpentSeconds/3600) * 100) / 100;
    timeSpent = "" + (timeSpentSeconds);
    day['timeSpent'] = timeSpent;
    created.splice(num, 1);
    desc.splice(num, 1);
    id.splice(num, 1);
    started.splice(num, 1);
    time.splice(num, 1);
    url.splice(num,1);
    worklogs['created'] = created;
    worklogs['desc'] = desc;
    worklogs['id'] = id;
    worklogs['started'] = started;
    worklogs['time'] = time;
    day['url']=url;
    return thisTime;
};

/**
 * Detects any timelogs in a single day that are outside of the date range
 */
filtertime.filterSingleDayLog = function(day, tasks, start, end) {
    var timeRemoved = 0;
    var correction = 0;
    if(day['timeSpentSeconds'] > 0) {
        var worklogs = day['worklogs'];
        var started = worklogs['started'];
        for (var i = 0; i < started.length; i++) {
            var thisDate = started[i];
            if (!filtertime.isTimeInDateRange(new Date(thisDate), start, end)) {
                timeRemoved += filtertime.removeSingleEntry(day, tasks, i, correction);
                correction++;
            }
        }
    }
    return timeRemoved;
};

/**
 * Filters the results array to remove time logs that fall
 * on the start/end date, but outside the hourly time range.
 *
 * Start/end must be the time with hours/etc, and formatted_start/end must
 * be the time without hours/etc.
 */
filtertime.filterTimeOutsideDates = function(results, start, end, formatted_start, formatted_end) {
    var startDate = new Date(start);
    var endDate = new Date(end);
    var userarray = results["user_array"];
    var task_array = results['task_array'];
    for (user in userarray) {
        var singleUserArray = userarray[user];
        var dailytime = singleUserArray["dailyTime"];
        var totalTime = Number(singleUserArray['totalTime']) * 3600;
        // we are only concerned about the first and last dates
        var firstDate = dailytime[formatted_start];
        var lastDate = dailytime[formatted_end];

        totalTime -= filtertime.filterSingleDayLog(firstDate, task_array, startDate, endDate);
        totalTime -= filtertime.filterSingleDayLog(lastDate, task_array, startDate, endDate);
        totalTime = Math.round((totalTime/3600) * 100) / 100;
        singleUserArray['totalTime'] = "" + totalTime;
    }
    return results;
};

module.exports = filtertime;