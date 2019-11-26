var data = {};
//The number of weeks to send to the status report, this is set in getStartAndEndDate()
var numWeeks;
//Will hold the start date of the current sprint from getStartAndEndDate()
var startDate;
var sprintTo;
var sprintFrom;
var displayName;
var selectedWeeks = [];
var usingSprintWeeks = true;
var selectedFullSprint = false;
var usingSprint = true;
var storedData = [];
var current_time_period = "Current Sprint"; //Change this with any default timebox selection changes too

/**
 * This class runs the Dashboard view main UI.
 * It is responsible for getting the list of projects, maintainin user selected projects,
 * and storing which weeks of the sprint should be shown
 *
 * @author griggszm@msoe.edu
 *         kouziosma@msoe.edu
 */

/**
 * Handles all button click events
 */
$(document).ready(function () {
    updateMyProjectsFromCookie();

    data.host = $('input[name="host"]').val();

    $('input:radio[name="timebox"]').on("change", function(){
        $("#fromDashboard").prop("disabled", true);
        $("#toDashboard").prop("disabled", true);
        $("#selectedTimebox").val($(this).val());
        usingSprint = true;

        current_time_period = $(this).val();

        if($(this).val() != "Custom Date") {
            $("#fromDashboard").val("");
                $("#toDashboard").val("");
        }

        switch($(this).val()) {
            case "Current Sprint":
                loadProjectContent();
            break;
            case "Custom Date":
                usingSprint = false;
                $("#fromDashboard").prop("disabled", false);
                $("#toDashboard").prop("disabled", false);
            break;
        }
    });

    $('#addProject').click(function () {
        updateAfterAdd();
    });

    $('#removeProject').click(function () {
        updateAfterRemove();
    });
});

/**
 * Sets up the date picker functionality
 * 
 * @author kouziosma@msoe.edu
 */
$(function() {
    var dateFormat = "mm/dd/yy",
    from = $("#fromDashboard")
    .datepicker({
        defaultDate: "",
        changeMonth: true,
        numberOfMonths: 1
    })
    .on("change", function () {
        var date = getDate(this)
        to.datepicker("option", "minDate", date);
        $("#sprintFrom").val($("#fromDashboard").val());
        updateDate();
    }),
    to = $("#toDashboard").datepicker({
        defaultDate: "",
        changeMonth: true,
        numberOfMonths: 1
    })
    .on("change", function () {
        var date = getDate(this)
        from.datepicker("option", "maxDate", date);
        $("#sprintTo").val($("#toDashboard").val());
        updateDate();
    });

/**
 * Gets the data out of the passed datepicker
 * 
 * @author kouziosma@msoe.edu
 */
function getDate(element) {
    var date;
    try {
        date = $.datepicker.parseDate(dateFormat, element.value);
    } catch (error) {
        date = null;
    }
    return date;
}
});

/**
 * Whenever a date is updated, check if both are changed - if so update the projects
 * @author kouziosma@msoe.edu
 */
function updateDate() {
    if ($("#fromDashboard").val() != "" && $("#toDashboard").val() != "") {
        loadProjectContent();
    }
}

/**
 * Gets sprint information and returns it to the callback
 * 
 * @author kouziosma@msoe.edus
 */
function getSprintInfo(callback) {
    var formData = $("#hiddenform").serializeArray();
    var url = '/get-sprints-by-key';

    $.ajax({
        type: 'POST',
        url: url,
        data: formData,
        success: function (data) {
            callback(data);
        },
        failure: function (data) {
            console.log("Failure");
        }
    })
}

/**
 * Forces the data to regenerate when the screen size changes
 * this is due to our graph not being dynamically sized
 * 
 * @author kouziosma@msoe.edu
 */
$(window).resize(function() {
    reDisplay();
})

/**
 * Redisplays the project data, used because the graph is statically fixed
 * so this refreshes that size. Used only when the window resizes.
 * 
 * @author kouziosma@msoe.edu
 */
function reDisplay() {
    $('#main_area').html("");

    for(var i = 0; i < storedData.length; i++) {
        generateVisuals(storedData[i]);
    }
}

/**
 * Loads in the projects from the projects portfolio, and calls a method to display them
 * 
 * @author kouziosma@msoe.edu
 */
function loadProjectContent() {
    $('#main_area').html('<div class="loader"></div>');
    if(usingSprint) {
        getSprintInfo(function(result){
            if(result) {
                $("#sprintArray").val(JSON.stringify(result));
                getProjData();
            } else {
                $('#main_area').empty();
            }
        });
    } else {
        getProjData();
    }
}

/**
 * Gets the jira project data for the projects in the projects array 
 * in the hidden form
 * 
 * @author kouziosma@msoe.edu
 */
function getProjData() {
    var data = $("#hiddenform").serializeArray();
    //If there's a sprint array
    if(data[5].value) { //sprintArray
        var sprintArray = JSON.parse(data[5].value).sprints;
        var projects = JSON.parse(data[5].value).projs;
        var length = projects.length;
    } else { //Else use the project array
        var sprintArray = null;
        var projects = data[0].value.split(";"); //projectArray
        var length = projects.length-1;
    }

    for(var i = 0; i < length; i++) {
        var url = '/loadProjects';
        if(sprintArray) {
            var sprintVal = JSON.stringify(sprintArray[i]);
            var project = projects[i];
        } else {
            var sprintVal = null;
            var project = projects[i];
        }
        //I am creating my own form object with the information we need
        var formData = [
            {
                name:  "projectArray",
                value: project
            },
            {
                name: "sprintTo",
                value: data[1].value
            },
            {
                name: "sprintFrom",
                value: data[2].value
            },
            {
                name: "displayName",
                value: data[3].value
            },
            {
                name: "selectedTimebox",
                value: data[4].value
            },
            {
                name: "sprintArray",
                value: sprintVal
            }
        ];

        $.ajax({
            type: 'POST',
            url: url,
            data: formData,
            async: false,
            success: function (data) {
                if(i == 0) {
                    $('#main_area').empty();
                }
                storedData.push(data);
                generateVisuals(data);
            },
            failure: function (data) {
                console.log("Failure");
            }
        })
    }
}

/**
 * Calculates the toal time for a given project based on te worklogs for each author
 * 
 * @param {*} data The worklogs
 * @param {*} name The author
 * @author kouziosma@msoe.edu
 */
function projectotalTime(data, name) {
    var time = 0;

    var projectTasks = data;
    for(dt in projectTasks.user_array[name].dailyTime) {
        time += projectDailyTime(name, data, projectTasks.user_array[name].dailyTime[dt].date);
    }

    return time;
}

/**
 * Calculates the daily time for the project for each user
 * 
 * @param {*} name The user
 * @param {*} data The worklogs
 * @param {*} date The current date
 * @author kouziosma@msoe.edu
 */
function projectDailyTime(name, data, date) {
    var time = 0;

    var projectTasks = data.task_array;
    for (var i = 0; i < projectTasks.length; i++) {
        var taskWorklogs = data.task_array[i].worklog.worklogs;
        for (var j = 0; j < taskWorklogs.length; j++) {
            var worklogAuthor = data.task_array[i].worklog.worklogs[j].updateAuthor.displayName;
            if (worklogAuthor == name) {
                var looped_date = data.task_array[i].worklog.worklogs[j].started;
                if (looped_date.substring(0, 10) == date) {
                    time += data.task_array[i].worklog.worklogs[j].timeSpentSeconds;
                }
            }
        }
    }

    return time;
}

/**
 * Calculates the total daily time based on each user logging time that day
 * 
 * @param {*} data The worklogs
 * @param {*} date The current date
 * @author kouziosma@msoe.edu
 */
function calcDailyTotal(data, date) {
    var time = 0;

    var projectTasks = data.task_array;
    for (var i = 0; i < projectTasks.length; i++) {
        var taskWorklogs = data.task_array[i].worklog.worklogs;
        for (var j = 0; j < taskWorklogs.length; j++) {
            var looped_date = data.task_array[i].worklog.worklogs[j].started;
            if (looped_date.substring(0, 10) == date) {
                time += data.task_array[i].worklog.worklogs[j].timeSpentSeconds;
            }
        }
    }

    return time;
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
 * Gets the total time spent for a project that week
 * 
 * @param {*} data The data specified to the time period
 * @param {*} proj The project being worked on
 * @author kouziosma@msoe.edu
 */
function getWeeksTime(data, proj) {
    var time = 0;
    if(data.timeSpentSeconds > 0) {
        for(var i = 0; i < data.worklogs.id.length; i++) {
            var project = data.worklogs.id[i].split("-")[0];
            if(project == proj) {
                time += data.worklogs.time[i];
            }
        }
    }
    return time;
}

/**
 * Parses through jira worklogs object, and only puts in the ones with Entry # matching
 * project.
 * @author kouziosma@msoe.edu
 */
function getProjectWorklogs(data) {
    var worklogs_info = [];
    //for all entries
    var issue = data.worklogs.issue;

    for(var i = 0; i < data.worklogs.id.length; i++) {
        var myRegexp = new RegExp("(<div(?: class='tooltip'){0,1}>(?:Entry #[0-9]+ and )*Entry #" + (i+1) + ".+?<\/div>)", 'g');
        var match = {};
        //For all issues with the current entry
        while(match = myRegexp.exec(issue)) {
            var msg = match[0];
            worklogs_info.push({
                message: msg,
                entry: (i + 1)
            })
            issue = issue.replace(msg, '');
        }
    }
    return worklogs_info;
}


/**
 * Generates the time table based on the worklogs for each proj
 * 
 * @param {*} data The worklogs
 */
function generateVisuals(data) {
    generation(data);
}

/**
 * Generates the time tables based on the worklogs for the given proj
 * and generates the graph to a specific id generated above the tables
 * 
 * @param {*} data The worklogs
 * @author kouziosma@msoe.edu
 */
function generation(data) {
    var projCount = 0;
    var totalTime = 0;
    var nameString = "";
    //If the passed data isn't a json object but instead a string, then there is no data for that project
    if (typeof data === 'string' || data instanceof String) {
        var body = "<div class='container' style='width:100%;max-width:100%!important'>" +
                    "<div overflow='auto'>" +
                    "<div class='h1' style='text-align: center'>";
        var display_time_period = current_time_period;
        if(current_time_period == "Custom Date") {
            display_time_period = $("#fromDashboard").val() + " to " + $("#toDashboard").val();
        }
        body += 
            data + "&nbsp-&nbsp" + display_time_period + 
            "</div>" +
            "</div>";
        body += "<div class='h5' style='margin-top:25px;text-align: center'>" + 
                "No worklogs data found";
                "</div";
        $('#main_area').append(body);

        //Creates partition between this project and next project
        $('#main_area').append("<hr style='border-top: 2px solid #bbbbbb; width: 75%'>");
    } else {
        for (proj in data.projects) {
            //This generates the table for each project
            var body = "<div class='container' style='margin-bottom: 50px;width:100%;max-width:100%!important'>" +
                "<div overflow='auto'>" +
                "<div class='h1' style='text-align: center'>";
                var display_time_period = current_time_period;
                if(current_time_period == "Custom Date") {
                    display_time_period = $("#fromDashboard").val() + " to " + $("#toDashboard").val();
                }
                body += 
                    data.projects[proj].name + "&nbsp-&nbsp" + display_time_period + 
                "</div>" +
                "</div>" +
                "<div id='chart_" + proj + "' style='height: 500px;padding-bottom: 50px;width:100%;max-width:100%;display: inline-block;'>" +
                "</div>";
            body += "<div name='divider' style='width: 100%; height: 50px'>" +
                "</div>" +
                "<div style='padding-bottom: 50px;width:100%;display: inline-block;'>" +
                "<table class='hide_overflow' id='full_tbl' cellspacing='0' style='margin:auto'>" +
                "<tr>" +
                "<td align='right'>" +
                "<table id='left' cellspacing='0' width='280px'>" +
                "<thead>" +
                "<th class='compact bottomb headcol leftb topb' align='center' height='380px'>" +
                "Names" +
                "</th>" +
                "<th class='compact leftb bottomb topb rightb' align='center' height='380px'>" +
                "Σ" +
                "</th>" +
                "</thead>" +
                "<tbody>";
            for (name in data.projects[proj].sorted_usernames) {
                nameString = data.projects[proj].sorted_usernames[name];
                totalTime = projectotalTime(data.projects[proj], nameString);
                if (totalTime >= 0) {
                    var formTime = formattedTime(totalTime);
                    body += "<tr>" +
                        "<td class='compact bottomb leftb' align='center'>" +
                            nameString +
                        "</td>" +
                        "<td class='compact leftb bottomb rightb' align='center'>" +
                            formTime +
                        "</td>" +
                        "</tr>";
                }
            }
            body += "</tbody>" +
                "<tfoot>" +
                "<tr class='dailyHours'>" +
                "<td class='compact leftb bottomb rightb' colspan='2' align='right'>" +
                    "Daily hours total:   " +
                "</td>" +
                "</tr>" +
                "<tr class='weeklyHours'>" +
                    "<td class='compact leftb bottomb rightb' colspan='2' align='right'>" +
                        "Weekly hours total:   " +
                    "</td>" +
                "</tr>" +
                "</tfoot>" +
                "</table>" +
                "</td>" +
                "<td>" +
                "<table class='overflow' id='overview' cellspacing='0'>" +
                "<thead>";
            for (d in data.dateHeader[projCount].dailyTime) {
                body += "<th class='compact rightb bottomb topb leftb' style='white-space:pre;border-collapse:collapse !important;' align='center' height='38px'>" +
                            data.dateHeader[projCount].dailyTime[d].desc +
                        "</th>";
            }
            body += "</thead>" +
                "<tbody>";
            for (name in data.projects[proj].sorted_usernames) {
                var nameString = data.projects[proj].sorted_usernames[name];
                var user = data.projects[proj].user_array[nameString];
                if (user.totalTime >= 0) {
                    body += "<tr>";
                    for (dt in user.dailyTime) {
                        var dayTime = projectDailyTime(nameString, data.projects[proj], dt);
                        dayTime = formattedTime(dayTime);
                        if (dayTime > 0) {
                            body += "<td class='compact rightb bottomb leftb' align='center'>";
                            var parsed_data = JSON.stringify(user.dailyTime[dt]);
                            parsed_data = parsed_data.replace(/\"/g, "&quot");
                            var worklog_info = getProjectWorklogs(user.dailyTime[dt]);
                            var parsed_worklogs = JSON.stringify(worklog_info);
                            parsed_worklogs = parsed_worklogs.replace(/\"/g, "&quot");
                            if (worklog_info.length > 0) {
                                body += "<a data-toggle='modal' data-target='#taskInfoModal' data-proj=\"" + proj + "\" style='color:#c13500' data-date=\"" + parsed_data + "\" data-filename=" + null + " data-issue=\"" + parsed_worklogs + "\">" +
                                            dayTime +
                                        "</a>";
                            } else {
                                body += "<a data-toggle='modal' data-target='#taskInfoModal' data-proj=\"" + proj + "\" data-date=\"" + parsed_data + "\" data-filename=" + null + " data-issue=\"" + parsed_worklogs + "\">" +
                                            dayTime +
                                        "</a>";
                            }
                        } else {
                            body += "<td class='comapact rightb bottomb leftb' align='center'>" +
                                " " +
                                "</td>";
                        }
                    }
                    body += "</tr>";
                }
            }
            body += "</tbody>" +
                "<tfoot>" +
                    "<tr class='dailyHours'>";
                        //for each day
                        for (dt in data.dateHeader[projCount].dailyTime) {
                            var dailyTotal = calcDailyTotal(data.projects[proj], dt);
                            if (dailyTotal == 0) {
                                body += "<td class='compact rightb leftb bottomb' align='center'>" +
                                        '</td>';
                            } else {
                                body += "<td class='compact rightb leftb bottomb' align='center'>" +
                                            formattedTime(dailyTotal) +
                                        "</td>";
                            }
                        }
            body += "</tr>" +
                    "<tr class='weeklyHours'>";
                        var indx = 0;
                        var numDays = 0;
                        for(d in data.dateHeader[projCount].dailyTime) {
                            numDays++;
                        }
                        //for every day
                        for(d in data.dateHeader[projCount].dailyTime) {
                            var weeklyTotal = 0;
                            //for every user
                            for (u in data.projects[proj].user_array) {
                                //for every day for those users
                                for(dt in data.projects[proj].user_array[u].dailyTime) {
                                    if(data.projects[proj].user_array[u].dailyTime[dt].endOfWeek.week == data.projects[proj].user_array[u].dailyTime[d].endOfWeek.week) {
                                        weeklyTotal += getWeeksTime(data.projects[proj].user_array[u].dailyTime[dt], proj);
                                    }
                                }
                            }
                            if(indx == numDays-1) {
                                body +="<td class='compact bottomb rightb' align='center'>" +
                                    formattedTime(weeklyTotal) +
                                "</td>";
                            } else if(data.projects[proj].user_array[u].dailyTime[d].endOfWeek.week == data.projects[proj].user_array[u].dailyTime[d].date) {
                                if(indx == 0) {
                                    body +="<td class='compact bottomb rightb leftb' align='center'>" +
                                        formattedTime(weeklyTotal) +
                                    "</td>";
                                } else {
                                    body +="<td class='compact bottomb rightb' align='center'>" +
                                        formattedTime(weeklyTotal) +
                                    "</td>";
                                }
                            } else {
                                if(indx==0) {
                                    body +="<td class='compact bottomb leftb' align='center'>" +
                                            "</td>";
                                } else {
                                    body +="<td class='compact bottomb' align='center'>" +
                                            "</td>";
                                }
                            }
                            indx++;
                        }
            body += "</tr>";
                "</tfoot>" +
            "</table>" +
            "</td>" +
            "</tr>" +
            "</table>" +
            "</div>";
            projCount++;

            //Appends table to body
            $('#main_area').append(body);

            //Creates partition between this project and next project
            $('#main_area').append("<hr style='border-top: 2px solid #bbbbbb; width: 75%'>");
            //Draws time chart and appends above time table
            drawChart(data, proj);
        }
    }
}

/**
 * Gets the desired cookie from the URI
 * 
 * @param {*} cname The name of the desired cookie
 */
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

/**
 * When the user loads in cookies for projects, it loads the cookie as a single string
 * into the projects array textbox. This will parse it out and add the data to my projects.
 * @author kouziosma@msoe.edu
 */
function updateMyProjectsFromCookie() {
    var projects = $('#projectArray').val();
    if (projects) {
        var projectsSplit = projects.split(';');
        projectsSplit.splice(-1);
        for (var parts in projectsSplit) {
            var parts2 = projectsSplit[parts];
            var proj = parts2.split(",")[1];
            var val = parts2.split(",")[0];
            $('#myProjectContent').append(
                "<div style='text-align:left;'>" + 
                    "<input type='checkbox' id='my" + val + "' value='" + val + "," + proj + "' data-key='" + val + "' name='my'>" +
                    "<span for='" + val + "'>" + 
                        proj + 
                    "</span>" + 
                "</div>"
            );
        }
    }
    loadProjectContent();
}

/**
 * Adds specific projects to the hidden text form that holds project info
 * @author: kouziosma@msoe.edu
 */
function updateAfterAdd() {
    var projs = $("#projectArray").val();
    var projs_array = projs.split(";");
    $("input:checkbox[name=all]:checked").each(function(){
        var data = $(this).val();
        if (!(projs_array.indexOf(data) > -1)) {
            projs += data + ";";
        }
    });
    $('#projectArray').val(projs);
    $("#hiddenform").submit();
    $("#projectArray").text(getCookie("projsListTextbox"));
}

/**
 * Empties specific projects from the hidden text form that holds project info
 * @author: kouziosma@msoe.edu
 */
function updateAfterRemove() {
    var projs = $("#projectArray").val();
    var projs_array = projs.split(";");
     $("input:checkbox[name=my]:checked").each(function(){
        var data = $(this).val();
        var index = projs_array.indexOf(data);
        if (index > -1) {
            projs_array.splice(index, 1);
        }
    });
    $('#projectArray').val(projs_array.join(";"));
    $("#hiddenform").submit();
    $("#projectArray").text(getCookie("projsListTextbox"));
}

/**
 * Add a method to the Date class to make it easier to add 7 days to a date.
 */
Date.prototype.addDays = function (days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
};

/**
 * Gets the min value from a list of integers, used to get first week
 */
function getMin(list) {
    var min = list[0];
    for (var i = 1; i < list.length; i++) {
        if (list[i] < min) {
            min = list[i];
        }
    }
    return min;
}

/**
 * Gets the max value from a list of integers, used to get last week
 */
function getMax(list) {
    var max = list[0];
    for (var i = 1; i < list.length; i++) {
        if (list[i] > max) {
            max = list[i];
        }
    }
    return max;
}

/**
 * Registers internally that the checkbox was checked/unchecked and tracks the selected weeks.
 * @param checkbox
 */
function handleclick(checkbox) {
    if (checkbox.id == "sprintCheckbox") {
        if (!selectedFullSprint) {
            selectedFullSprint = true;
        } else {
            selectedFullSprint = false;
        }
    } else {
        var wk = checkbox.id.replace("week", "");
        if (selectedWeeks.includes(Number(wk))) {
            selectedWeeks.splice(selectedWeeks.indexOf(Number(wk)), 1);
        } else {
            selectedWeeks.push(Number(wk));
        }
        var minWeek = getMin(selectedWeeks);
        var maxWeek = getMax(selectedWeeks);
        displayName = "Weeks " + minWeek + " - " + maxWeek;
        sprintTo = startDate.addDays(7 * (minWeek - 1));
        sprintFrom = startDate.addDays(7 * (maxWeek));
    }

    $('#selectedFullSprint').val(selectedFullSprint);
    $('#sprintTo').val(sprintTo);
    $('#sprintFrom').val(sprintFrom);
    $('#displayName').val(displayName);
    //checkProjectsExist();
}