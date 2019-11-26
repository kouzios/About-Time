/**
 * This class deals with everything status report related on the client side
 * @author jacksonbrant@msoe.edu
 * @author kouziosma@msoe.edu
 */

//The number of weeks to send to the status report, this is set in getStartAndEndDate()
var numWeeks;
//Will hold the start date of the current sprint from getStartAndEndDate()
var startDate;
//HTML used to generate the preview for the status report
var statusReportHTML = "";

/**
 * When the generate report button is pressed, this function creates a dialog to ask the user if
 * they want a preview first
 * @author jacksonbrant@msoe.edu
 */
$("#newreport_btn").click(function() {
    //Commented out, because no preview means no burndown chart...
    //if($('#hasConfluence').val() === 'false') { 
        $("#generateReportStatus").html("Creating preview... This may take a hot minute!");
        $('#newreport_btn').prop('disabled', true);
        createNewStatusReport(true);
        return;
    //}
    /* Commented out, because no preview means no burndown chart...
    //Create a dialog box to see if the user wants to view a preview first
    $("#dialog-confirm").html("Do you want to generate a preview first?");
    // Define the Dialog and its properties.
    $("#dialog-confirm").dialog({
        resizable: false,
        modal: true,
        title: "Generate Preview?",
        height: 250,
        width: 400,
        buttons: {
            "Yes": function() {
                
                $(this).dialog('close');
                $('#selectSpace').prop('disabled', true);
                $("#generateReportStatus").html("Creating preview...");
                createNewStatusReport(true);
                
            },
            "No": function() {
                $(this).dialog('close');
                $('#selectSpace').prop('disabled', true);
                $("#generateReportStatus").html("Creating status report...");
                createNewStatusReport(false);
            }
        }
    });
    */
});

/**
 * The next 2 on click functions are used from within the status report preview
 * cancel sends you back to the main page
 * confirm will send the html to confluence to create a page
 * @author jacksonbrant@msoe.edu
 */
$("#preview_cancel").click(function() {
    statusReportHTML = "";
    location.reload();
});
$("#preview_confirm").click(function() {
    $('#preview_confirm').prop('disabled', true);
    sendHTMLReport();
    $("#generateReportFromPreview").html("Sending info to confluence...");
});

/**
 * Each time a checkbox in the weeks div is selected or deselected
 */
$("#weekList").change(function () {
    checkWeeks();
});

/**
 * checks which checkboxes should be checked or unchecked/disabled
 * Users should only be able to select consecutive weeks
 * @author jacksonbrant@msoe.edu
 */
function checkWeeks(){
    $('#newreport_btn').prop('disabled', true);
    if($('#sprintCheckbox').is(":checked")){
        $('#newreport_btn').prop('disabled', false);
        for (let i = 0; i < numWeeks; i++) {
            document.getElementById("week" + (i + 1)).disabled = true;
            document.getElementById("week" + (i + 1)).checked = false;
        }
    } else {
        //Determines whether or not a checked box has been encountered
        let first = true;
        //keep track of whether the last checked checkbox has been seen
        //set to true when the first non checked checkbox is seen after one or more checked
        let last = false;
        //Check for which checkboxes to disable.
        //Only allow the user to select consecutive weeks
        for (let i = 0; i < numWeeks; i++) {
            //If none are selected, any should be selectable
            document.getElementById("week" + (i + 1)).disabled = false;
            if ($('#week' + (i + 1)).is(":checked") && first) {
                $('#newreport_btn').prop('disabled', false);
                first = false;
                //Disable all checkboxes more than one week before
                for (let x = i; x >= 2; x--) {
                    document.getElementById("week" + (x - 1)).disabled = true;
                }
            } else if (last === true) {
                document.getElementById("week" + (i + 1)).disabled = true;
                $('#week' + (i + 1)).prop('checked', false);
            } else if (!$('#week' + (i + 1)).is(":checked") && !first) {
                last = true;
            }
        }
    }
}

/**
 * gets the start and end date for the currently selected sprint. Used to populate the weekList div
 * @author jacksonbrant@msoe.edu
 */
function getStartAndEndDate(){
    $('#weekList').html('<div class="weekInputDiv">' +
        '                    <input type = "checkbox" class="form-check-input" id="sprintCheckbox" checked></div>' +
        '                <div class="weekOptionLabelDiv">' +
        '                    <label for="sprintCheckbox">Whole Sprint</label></div>');
    data.sprint = $("#sprintList").val();
    $.ajax({
        type: 'POST',
        data: data,
        url: '/getStartAndEndDate',
        success: function(responseData) {
            let start = responseData.start;
            let end = responseData.end;
            if(start != undefined && end != undefined) {
                let endDate  = new Date(end.substring(0, 4), parseInt(end.substring(5, 7)) - 1, end.substring(8, 10));
                startDate  = new Date(start.substring(0, 4), parseInt(start.substring(5, 7)) - 1, start.substring(8, 10));
                let timeDiff = Math.abs(endDate.getTime() - startDate.getTime());
                let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
                numWeeks = Math.ceil(diffDays / 7);
                for(let i=1; i<=numWeeks; i++){
                    $('#weekList').html($('#weekList').html() + '<div class="weekInputDiv form-check-input"><input id="week' + i +'" type="checkbox"></div>' +
                        '<div class="weekOptionLabelDiv"><label for="week' + i + '">Week ' + i + '</label></div>');
                }
                checkWeeks();
            }
        },
        error: function (xhr, status, error) {
            console.log(xhr);
        }
    });
}

/**
 * Gets jira burndown data for given project
 * 
 * @author kouziosma@msoe.edu
 */
function getBurndownData(callback) {
    data.selectedSprint = $("#sprintList").val();
    $.ajax({
        type:  'GET',
        url: '/get-jira-info',
        async: false,
        data: data,
        success: callback
    })
}

/**
 * creates a new status report by checking to see if the preview needs to be viewed first
 * @param preview
 * @returns {number}
 * @author jacksonbrant@msoe.edu
 */
function createNewStatusReport(preview) {
    data.startDate = startDate;
    data.numWeeks = numWeeks;
    data.weeks = [];
    //Check if the status report will be generated for the sprint
    //If not, find which weeks to generate for
    if(($('#sprintCheckbox').is(':checked'))){
        data.weeks[0] = "sprint";
    } else {
        //assume nothing is checked and if nothing is checked after checking, then display a message to the user
        let nothingChecked = true;
        for(let i=0; i<numWeeks; i++){
            let currentStartDate = new Date(), currentEndDate = new Date();
            currentStartDate.setTime(startDate.getTime() + (i * 7 * 86400000)); //milliseconds in a day
            //make sure the end date for the week is 6 days in the future.
            currentEndDate.setTime(currentStartDate.getTime() + (6 * 86400000));
            //If the week is selected, send the start and end date of the week
            //data.weeks[i] = [startDate, endDate]
            if(($('#week' + (i+1)).is(':checked'))){
                nothingChecked = false;
                data.weeks[i] = [currentStartDate, currentEndDate];
            } else {
                data.weeks[i] = null;
            }
        }
        if(nothingChecked === true && $("#usingSprintForm").val() === "true"){
            $("#generateReportStatus").html("Error creating report. You must select at least one week.");
            $('#selectSpace').prop('disabled', false);
            return;
        }
    }
    selectedSpace = $('#space_select option:selected').val();
    data.confluenceKey = selectedSpace;
    if(data.confluenceKey === 'Select a Space' && !preview){
        $("#generateReportStatus").html("You must select a space first!");
        $('#selectSpace').prop('disabled', false);
        return -1;
    }
    var pn = $("#projectList").val();
    data.project = pn;
    data.to = $("#to").val();
    data.from = $("#from").val();
    data.sprint = $("#sprintList").val();
    data.usingSprintForm = $("#usingSprintForm").val();
    var burndowndata = "";

    //Gets the jira url, token, board ID
    getBurndownData(function(returnVals) {
        if(returnVals == "ERROR") {
            burndowndata = [];
        } else {
            burndowndata = JSON.parse(returnVals.burndownData);
        }
    });
    data.burndowndata = burndowndata;

    url = '/createNewStatusReport?preview=' + preview;
    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        url: url,
        success: function(responseData) {
            if(preview === true){
                $('#title').html("Status Report");
                $('#title_label').html("");
                statusReportHTML = responseData.url;
                $('#mainPage2').html("");
                $('#instructorViewForm').html("");
                $('#error').html("");
                $('#mainPage').html(statusReportHTML);
                $('#preview_cancel').html('Cancel');
                $('#preview_cancel').show();
                $('#preview_confirm').show();
                if(!data.confluenceKey || data.confluenceKey === 'Select a Space') {
                    $('#preview_cancel').html("Go Back");
                    $('#preview_confirm').hide();
                }
                $('#preview_buttons').show();
                //These need to be set so that the buttons don't turn white after they are clicked.
                $("#preview_confirm").css("background-color", "#ffffff");
                $("#preview_confirm").css("border-color", PROJECT_COLOR);
                $("#preview_confirm").css("color", PROJECT_COLOR);
                $("#preview_cancel").css("background-color", "#ffffff");
                $("#preview_cancel").css("border-color", PROJECT_COLOR);
                $("#preview_cancel").css("color", PROJECT_COLOR);
                data.name = responseData.name;
                $("#report_btn").hide();
                document.getElementById('generate_status_report_modal').style.display="none";
                document.getElementById('footer').style.display = "none";
                document.getElementById('clockDiv').style.display = "none";
                drawChart($("#burndowndataFormatted").val());
                window.scrollTo(0,0);
            } else {
                $("#generateReportStatus").html('<a target="_blank" href="' + responseData.url + '" style="color:' + PROJECT_COLOR + ';"><u>' + responseData.name + '</u></a>' + " created successfully!");
                $('#selectSpace').prop('disabled', false);
                document.getElementById('generate_status_report_modal').style.display="none";
                document.getElementById('footer').style.display = "none";
            }
        },
        error: function (xhr, status, error) {
            if (xhr.responseJSON.error) {
                $("#generateReportStatus").html("Error creating report: " + xhr.responseJSON.error);
                $('#selectSpace').prop('disabled', false);
            } else {
                $("#generateReportStatus").html("Error creating report");
                $('#selectSpace').prop('disabled', false);
            }
        }
    });
}

/**
 * sends the html that was already created with the preview view of the status report generator
 * @author jacksonbrant@msoe.edu
 */
function sendHTMLReport(){
    data.confluenceKey = selectedSpace;
    var chart = $("#burndown_section").html();
    var gadget = "<span style='color: blue'>To generate a burndown chart: Edit the page, press the [+] button on the toolbar, select Other Macros, type in Sprint Burndown Gadget, select your desired options, save them, then save the macro. Note: This burndown chart doesn't export as a pdf or word document, so use a screenshot if you need this as a pdf. In addition, make sure you select a specific sprint - choosing Next Sprint Due causes the macro to empty your chart when the sprint ends!</span>";
    $("#burndown_section").html(gadget);
    $("#burndown_section").css("height", "auto");
    var html = $("#mainPage").html();
    $("#burndown_section").html(chart);
    $("#burndown_section").css("height", "500px");
    //Replaces open tags with closed tags, to satisfy Confluence's xhtml filtering
    html = html.replace(/<(img|hr|br|input)(.*?)\/?>(<\/(img|hr|br|input)>)?/g, '<$1$2></$1>');
    data.html = html;
    $.ajax({
        type: 'POST',
        data: data,
        url: '/generateReportFromPreview',
        success: function(responseData) {
            $("#generateReportFromPreview").html('<a target="_blank" href="'+responseData.url+'" style="color:' + PROJECT_COLOR + ';"><u>' + responseData.name + '</u></a>' + " created successfully!");
            $("#preview_cancel").html('Go Back');
        },
        error: function (xhr, status, error) {
            if(xhr.responseJSON.error) {
                $("#generateReportStatus").html("Error creating report: " + xhr.responseJSON.error);
                $('#selectSpace').prop('disabled', false);
            }
            else {
                $("#generateReportStatus").html("Error creating report");
                $('#selectSpace').prop('disabled', false);
            }
        }
    });
}