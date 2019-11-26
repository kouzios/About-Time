//The hex color that matches the color scheme of the page
var PROJECT_COLOR = '#8c3800'; //#A8050F to go back to red
//the selected space is set when the status report is created
var selectedSpace;
var data = {};

//By default the status report generator is not shown
status_report=false;
tableUp = false;
var tableArea = $('#main_area');
var stored_table_data;
var display_table = false;


$(document).ready(function () {
    data.host = $('input[name="host"]').val();
    populateSprintList();
    updateSpace();
    listStartUp();
    checkSubmitIssueInputs();

    $('[data-toggle="tooltip"]').tooltip();

    //This is the submit a bug popup
    var issue_modal = document.getElementById('submit_a_bug');
    var instructions_modal = document.getElementById('instruction_view');
    var about_modal = document.getElementById('about_us');
    var generate_report_modal = document.getElementById('generate_status_report_modal');

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == issue_modal) {
            issue_modal.style.display = "none";
        }
        if (event.target == instructions_modal) {
            instructions_modal.style.display = "none";
        }
        if (event.target == about_modal) {
            about_modal.style.display = "none";
        }
        if(event.target == generate_report_modal){
            generate_report_modal.style.display = "none";
        }
    };

    $("#projectList").change(function() {
        populateSprintList();
        updateSpace();
    });

    $('#selectSpace').change(function(){
        var current_space = $(this).find(':selected');
        var url = current_space.data('url');
        if(url){
            $('#current_space').html('Currently writing to space: <a target="_blank" href="' + url + '">' + current_space[0].label + '</a>');
        }else{
            $('#current_space').html("Currently writing to space: none");
        }
    });

    //When the use custom date button is pressed
    //Switches from sprint view to custom date
    // $("#date_btn").click(function() {
    //     $("#usingSprintForm").val("false");
    //     checkWindowSize();
    //     $("#sprintListDiv").toggle();
    //     $("#custom_datepicker").toggle();
    //     $("#sprint_btn").toggle();
    //     $("#date_btn").toggle();
    //     $("#weekListAndLabel").hide();
    //     checkInputs();
    // });

    //When the use sprint list button is pressed from the custom date view
    //Switches from custom date to sprint view
    $("#sprint_btn").click(function() {
        $("#usingSprintForm").val("true");
        $("#sprintListDiv").toggle();
        $("#custom_datepicker").toggle();
        $("#sprint_btn").toggle();
        $("#date_btn").toggle();
        if(status_report === true){
            $("#weekListAndLabel").show();
        }
        checkInputs();
    });

    //Switches from time view to status report
    $("#report_btn").click(function() {
        // Default
        document.getElementById('generate_status_report_modal').style.display='block';
        status_report = true;
        // $("#title_label").text("Status Report Generator");
        //$("#instructorView").hide();
        if($("#usingSprintForm").val() === "true") {
            $("#weekListAndLabel").show();
        }
        //
        // Time Log Viewer
        //$("#timeview_btn").toggle();
        //$("#show").toggle();
        //
        // // Status Reports
        //$("#report_btn").hide();
        $("#newreport_btn").show();
        $("#statusReportInfo").show();
        let text = $('#hasConfluence').val() === 'false' ? 'You can only generate previews. In order to create status reports on Confluence, please set up Confluence.' : '';$("#generateReportStatus").html(text).show();

        $("#statusReportListDiv").show();
        $("#space_select").show();
    });

    //Switches from status report to time view
    $("#timeview_btn").click(function() {
        // Default
        status_report = false;
        $("#title_label").text("Time Viewer");
        $("#instructorView").show();
        $("#weekListAndLabel").hide();


        // Time Log Viewer
        $("#timeview_btn").hide();
        $("#show").toggle();

        // Status Reports
        $("#report_btn").toggle();
        $("#newreport_btn").hide();
        $("#statusReportInfo").hide();
        $("#generateReportStatus").html("").hide();
        $("#statusReportListDiv").hide();
        $("#space_select").hide();
    });

    $('input').change(checkInputs);
    $('#issueTitle').on("change keyup keydown paste click", function() {
        checkSubmitIssueInputs();
    });
    $('#issueDescription').on("change keyup keydown paste click", function() {
        checkSubmitIssueInputs();
    });

    $("select").change(function(){
        checkInputs();
        //If the sprint list is populated, get the start and end date
        if(!($('#sprintList').val() === null)) {
            //see statusReport.js
            getStartAndEndDate();
        }
    });

    $('#instructorView').click(function () {
        //TODO: Send name and sprint for pn storage
        $("#projectName").val($("#projectList").val());
        $("#sprintName").val($("#sprintList").val());
        $("#instructorViewForm").submit();
    });

    /**
     * detects when the View Logs button is clicked
     * can detect middle clicks to open in a new tab
     * @author jacksonbrant@msoe.edu
     */
    $('#show').click(function(e){
        if($('#sprintR').prop('checked')){
            $("#usingSprintForm").val("true");
        }
        else if($('#customTimeR').prop('checked')){
            $("#usingSprintForm").val("false");
        }
        $('#mainPage').submit();
    });

    $('#sprintR').on("click", function (e) {
        $("#usingSprintForm").val('true');
        listStartUp();
    });

    $('#customTimeR').on("click", function(e){
        $('#usingSprintForm').val('false');
        $('#from').removeAttr('disabled');
        $('#to').removeAttr('disabled');
        $('#fromLabel').css("color", "#010000");
        $('#toLabel').css("color", "#010000");
        $('#sprintList').attr('disabled','disabled');
        $('#sprintListLabel').css('color', '#E6E6E6');
    });
});

/**
 * check inputs to decide what state the buttons will be in
 * @author jacksonbrant@msoe.edu, and Connor Walters
 */
function checkInputs() {
    // Disable the view logs button if they don't have a project and time range or sprint
    if ($('#projectList').find(':selected') === undefined
        || ($('#usingSprintForm')[0].value === 'true' && $('#sprintList').find(':selected').val() === undefined)
        || ($('#usingSprintForm')[0].value === 'false' && ($('#to').val() === '' || $('#from').val() === ''))){
        //(!$('#to').val().match(/\d{1,2}\/\d{1,2}\/\d{4}/) || !$('#from').val().match(/\d{1,2}\/\d{1,2}\/\d{4}/)) If we want to make sure dates are formatted correctly
        $('#show').prop('disabled', true);
        $('#newreport_btn').prop('disabled', true);
    }else {
        $("#show").prop("disabled", false);
        $('#newreport_btn').prop('disabled', false);
    }
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
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
 * Checks to make sure the inputs for the issue submission page are filled in before enabling the submit button
 * @author sullivan-bormannaj
 */
function checkSubmitIssueInputs(){
    var title = $('#issueTitle').val();
    var description = $('#issueDescription').val();

    if(title && title !== "" && description && description !== ""){
        $("#bug_submit_button").prop("disabled", false);
        $("#bug_submit_button").css("background-color", "#ffffff");
        $("#bug_submit_button").css("border-color", PROJECT_COLOR);
        $("#bug_submit_button").css("color", PROJECT_COLOR);
    } else{
        $('#bug_submit_button').prop('disabled', true);
        $("#bug_submit_button").css("background-color", "#666666");
        $("#bug_submit_button").css("border-color", "#666666");
        $("#bug_submit_button").css("color", "#ffffff");
    }
}

function listStartUp(){
    $('#from').attr('disabled', 'disabled');
    $('#to').attr('disabled', 'disabled');
    $('#fromLabel').css("color", '#E6E6E6');
    $('#toLabel').css("color", "#E6E6E6");
    $('#sprintList').removeAttr('disabled');
    $('#sprintListLabel').css("color", '#010000');
}

/**
 * called from the pug file as onclick='submitIssue()
 * do not delete
 * @author sullivan-bormannaj
 */
function submitIssue(){
    var title = $('#issueTitle').val();
    var description = $('#issueDescription').val();
    var issueType = $('#issueType').val();
    var priority = $('#issuePriority').val();
    var email = $('#issueEmail').val();

    data.title = title;
    data.description = description;
    data.issueType = issueType;
    data.priority = priority;
    data.email = email;

    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        url: '/submitAnIssue',
        success: function(responseData) {
            if(responseData.error){
                $("#error")[0].innerHTML =  responseData.error;
                $("#success")[0].innerHTML = "";

            } else if(responseData.success){
                $("#success")[0].innerHTML = responseData.success;
                $("#error")[0].innerHTML = "";

                $('#issueTitle').val("");
                $('#issueDescription').val("");
                $('#issueEmail').val("");
                $('#issueType').val("bug");
                $('#issuePriority').val("trivial");
                checkSubmitIssueInputs();
            }
        },
        error: function (xhr, status, error) {
            console.log('Error: ' + error.message);
        }
    });
    document.getElementById('submit_a_bug').style.display='none'
}

function populateSprintList() {
    //disable the dropdown to avoid loading sprints from multiple projects
    //Before, if multiple projects were chosen quickly in succession then it would load sprints from both
    $('#projectList').prop('disabled', true);
    var pn = $("#projectList").val();
    data.project = pn;
    $('#sprintList').empty();
    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        url: '/populateSprintList',
        success: function(responseData) {

            var sprint = responseData.sprint;
            if ("undefined" === typeof sprint[0]) {
                $('#sprintList').append($("<option></option>").text('No sprint data for this project'));
            } else {
                for(i = sprint.length - 1; i >= 0; i--) {
                    var cookie = getCookie('pn');
                    if(cookie){
                        cookie = JSON.parse(cookie.substring(cookie.indexOf("{")));
                    }
                    var name = sprint[i].sprint.name;
                    if(cookie && cookie.sprint && name === cookie.sprint){
                        $('#sprintList').append($("<option></option>").attr("value",name).attr("name",name).attr("selected", true).text(name));
                    } else{
                        $('#sprintList').append($("<option></option>").attr("value",name).attr("name",name).text(name));
                    }
                }
            }
            if(getCookie('sprintList') && getCookie('pn') === pn){
                $('#sprintList').val(getCookie('sprintList'));
            }
            //Re-enable the project dropdown once the sprints are populated
            $('#projectList').prop('disabled', false);
            checkInputs();
            getStartAndEndDate();
        },
        error: function (xhr, status, error) {
            console.log('Error: ' + error.message);
            //Re-enable the project dropdown once there is an error
            $('#projectList').prop('disabled', false);
        }
    });
    //Re-enable dropdown after 4 seconds in case something weird happens
    setTimeout(function(){ $('#projectList').prop('disabled', false);}, 4000);
    checkInputs();
}

function updateSpace(){
    var selected_project = $('#projectList').find(':selected');
    var selected_space = $('#space_select').find('option[value="'+selected_project.data('key')+'"]');
    if(selected_space.length != 0){
        selected_space.prop('selected', 'selected').change();
        $('#current_space').html('Currently writing to space: <a target="_blank" href="' + selected_space.data('url') + '">' + selected_space[0].label + '</a>');
    }else{
        $('#space_select option[name="Select a Space"]').prop('selected', 'selected').change();
        $('#current_space').html("Currently writing to space: none");
    }
}

$('#showTable').on('click', function () {
    display_table = !display_table;
    prepareTableArea(); 
});

function prepareTableArea() {
    $('#col').css('width', '100%');
    tableArea = $('#main_area_2');
    tableArea.css('overflow','scroll');

    tableArea.html("<img src='/images/loader.gif'>");
    if(!tableUp) {
        tableUp = true;

        var comb = $('#projectList').val();

        $.ajax({
            type: 'POST',
            data: JSON.stringify({something: "something"}),
            contentType: 'application/json',
            url: '/getTableResults',
            success: function (data) {
                var sprintArray = data;
                var formData = [
                    {
                        name: "projectArray",
                        value: comb
                    },
                    {
                        name: "sprintTo",
                        value: ""
                    },
                    {
                        name: "sprintFrom",
                        value: ""
                    },
                    {
                        name: "displayName",
                        value: ""
                    },
                    {
                        name: "selectedTimebox",
                        value: "Current Sprint"
                    },
                    {
                        name: "sprintArray",
                        value: JSON.stringify(sprintArray)
                    }
                ];
                onTableOk(formData);
            }

        });
    }
    else{
        tableUp = false;
        $('#col').css('width', '');
        $('#main_area').html("");
        $('#main_area').css("overflow", "visible");
        $('#main_area_2').html("");
        $('#main_area_2').css('overflow', '');
    }
}

function onTableOk(formData) {
    $.ajax({
        type: 'POST',
        url: "/loadProjects",
        data: formData,
        async: true,
        success: function (data) {
            generateTable(data);
        },
        failure: function (data) {
        }
    });
}

/**
 * On window resize, re-generate the table
 * 
 * @author kouziosma
 */
$(window).resize(function() {
    if(display_table) {
        prepareTableArea();
    }
})

/**
 * Generates the time tables based on the worklogs for the given proj
 * and generates the graph to a specific id generated above the tables
 * 
 * @param {*} data The worklogs
 * @author kouziosma@msoe.edu
 * @author avilese@msoe.edu
 */
function generateTable(data) {
    var projCount = 0;
    var totalTime = 0;
    var nameString = "";
    for (proj in data.projects) {
        //This generates the table for each project
        var body = "<div class='container' style='width:100%;max-width:100%!important'>" +
            "<div overflow='visible'>" +
            "<div class='h1' style='text-align: center'>";
        body += "<div name='divider' style='width: 100%;'>" +
            "</div>" +
            "<div style='width:100%;display: inline-block;'>" +
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
        for (d in data.dateHeader[projCount].dailyTime) {
            numDays++;
        }
        //for every day
        for (d in data.dateHeader[projCount].dailyTime) {
            var weeklyTotal = 0;
            //for every user
            for (u in data.projects[proj].user_array) {
                //for every day for those users
                for (dt in data.projects[proj].user_array[u].dailyTime) {
                    if (data.projects[proj].user_array[u].dailyTime[dt].endOfWeek.week == data.projects[proj].user_array[u].dailyTime[d].endOfWeek.week) {
                        weeklyTotal += getProjectTime(data.projects[proj].user_array[u].dailyTime[dt], proj);//data.projects[proj].user_array[u].dailyTime[dt]
                    }
                }
            }
            if (indx == numDays - 1) {
                body += "<td class='compact bottomb rightb' align='center'>" +
                    formattedTime(weeklyTotal) +
                    "</td>";
            } else if (data.projects[proj].user_array[u].dailyTime[d].endOfWeek.week == data.projects[proj].user_array[u].dailyTime[d].date) {
                if (indx == 0) {
                    body += "<td class='compact bottomb rightb leftb' align='center'>" +
                        formattedTime(weeklyTotal) +
                        "</td>";
                } else {
                    body += "<td class='compact bottomb rightb' align='center'>" +
                        formattedTime(weeklyTotal) +
                        "</td>";
                }
            } else {
                if (indx == 0) {
                    body += "<td class='compact bottomb leftb' align='center'>" +
                        "</td>";
                } else {
                    body += "<td class='compact bottomb' align='center'>" +
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
       tableArea.html(body);
    }
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
 * Gets the total time spent for a project that week
 * 
 * @param {*} data The data specified to the time period
 * @param {*} proj The project being worked on
 * @author kouziosma@msoe.edu
 */
function getProjectTime(data, proj) {
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
        //if the entry we're looking at is for the current project
        //if (data.worklogs.id[i].split("-")[0] == proj) {
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
        //}
    }
    return worklogs_info;
}
