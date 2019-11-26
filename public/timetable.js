var filename = '';

//@author Tripp Horbinski
//@author Matthew Kouzios
$(document).ready(function () {
    $('#taskInfoModal').on('show.bs.modal', function (event) { // Id of shared modal
        var day  = $(event.relatedTarget); // Anchor tag that triggered the modal
        var date = day.data('date'); // Date object from dailyTime for user
        var proj = day.data('proj');
        date = date.replace(/&quot/g, "\"");
        date = JSON.parse(date);
        if(day.data('filename')) {
            filename = day.data('filename');
        }
        var url  = date.url; // URL for issues
        var wlogid = date.worklogs.id; // The key for each worklog
        var wlogtime = date.worklogs.time; // The time for each worklog
        var wlogdesc = date.worklogs.desc; // The comment for each worklog
        var wlogstarted = date.worklogs.started;

        var issue = day.data('issue');
        if(issue != "") {
            issue = issue.replace(/&quot/g, "\"");
            issue = JSON.parse(issue);
        } else {
            issue = [];
        }
        
        var dataArray = []; // Store each worklog data as an object
        for (var i = 0; i < url.length; i++) {

            // Format time in hours
            var t = wlogtime[i]
            t = formattedTime(t);

            var rawStart = new Date(wlogstarted[i]);
            var rawEnd = addMinutes(rawStart, wlogtime[i]/60);
            var parsedStart = dateConverter.to12HourString(rawStart);
            var parsedEnd = dateConverter.to12HourString(rawEnd);
            if(wlogid[i].split("-")[0] == proj) {
                var data = {
                    id: wlogid[i],
                    time: t,
                    url: url[i],
                    desc: wlogdesc[i],
                    start: parsedStart,
                    end: parsedEnd,
                    current_project: true
                };
                dataArray.push(data);
           } else {
                var data = {
                    id: wlogid[i],
                    time: t,
                    url: url[i],
                    desc: wlogdesc[i],
                    start: parsedStart,
                    end: parsedEnd,
                    current_project: false
                };
                dataArray.push(data); 
           }
        }

        // Create dynamic information for the modal
        var title = '<h3>More details for ' + date.date + '<h3>';
        // Display each worklog in a formatted table
        var content = '<h3 style="text-align: center"><b>Worklogs Table</b></h3><table><tr><th>Entry</th><th>Key</th><th>Worked</th><th>Started</th><th>Ended</th><th class="absorbing-column">Description</th></tr>';
        var index = 1;
        $.each(dataArray, function(e){
            if(dataArray[e].current_project) {
                content += '<tr><td class="prep" align="center">' + index++ +'</td><td class="pre" align="center"><a style="color: #3d53ff" href="' + dataArray[e].url + '" target="_blank">' + dataArray[e].id
                + '</a></td><td class="pre" align="center">' + dataArray[e].time + '</td>'+
                '</a></td><td class="pre" align="center">' + dataArray[e].start + '</td>'+
                '</a></td><td class="pre" align="center">' + dataArray[e].end + '</td>'+
                '<td>' + dataArray[e].desc + '</td></tr>';
            } else {
                content += '<tr style="background-color: #bbbbbb" data-toggle="tooltip" data-placement="top" title="Not current project"><td class="prep" align="center">' + index++ +'</td><td style="color: lightgrey" class="pre" align="center"><a style= href="' + dataArray[e].url + '" target="_blank">' + dataArray[e].id
                + '</a></td><td class="pre" align="center">' + dataArray[e].time + '*</td>'+
                '</a></td><td class="pre" align="center">' + dataArray[e].start + '</td>'+
                '</a></td><td class="pre" align="center">' + dataArray[e].end + '</td>'+
                '<td>' + dataArray[e].desc + '</td></tr>';
            }
        });
        content += '</table>';
        content += '<div style="text-align: right; margin-bottom: 10px">*Time does not count for project\'s daily total</div><hr>';
        if(issue.length > 0) {
            content += "<div class='d-flex justify-content-center justify-items-center'><h3><b>Unusual Logging:</b></h3></div>";
        }
        for(var i = 0; i < issue.length; i++) {
            content += "<div class='d-flex flex-row' style='margin-bottom:5px;'>" + issue[i].message + "</div>";
        }

        // Update the modal's content.
        var modal = $(this);
        modal.find('.modal-title').html(title);
        modal.find('.modal-body').html(content)
    });
});

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
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

function update(jscolor) {
    // 'jscolor' instance can be used as a string
    $('#csvbtn').css('background-color', '#' + jscolor);
    $('#full_tbl th').css('background-color', '#' + jscolor);
    $('#task th').css('background-color', '#' + jscolor);
}
