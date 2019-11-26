var filename = '';

//@author Tripp Horbinski
$(document).ready(function () {
    $('#taskInfoModal').on('show.bs.modal', function (event) { // Id of shared modal
        var day  = $(event.relatedTarget); // Anchor tag that triggered the modal
        var date = day.data('date'); // Date object from dailyTime for user
        if(day.data('filename')) {
            filename = day.data('filename');
        }
        var url  = date.url; // URL for issues
        var wlogid = date.worklogs.id; // The key for each worklog
        var wlogtime = date.worklogs.time; // The time for each worklog
        var wlogdesc = date.worklogs.desc; // The comment for each worklog
        var wlogstarted = date.worklogs.started;

        var issue = day.data('issue');
        var dataArray = []; // Store each worklog data as an object
        for (var i = 0; i < url.length; i++) {
            // Format time in hours
            var t = wlogtime[i]/3600;
            if (wlogtime[i]%3600 === 0)
                t = t.toFixed(0);
            else
                t = t.toFixed(2);

            var rawStart = new Date(wlogstarted[i]);
            var rawEnd = addMinutes(rawStart, wlogtime[i]/60);
            var parsedStart = dateConverter.to12HourString(rawStart);
            var parsedEnd = dateConverter.to12HourString(rawEnd);

            var data = {
                id: wlogid[i],
                time: t,
                url: url[i],
                desc: wlogdesc[i],
                start: parsedStart,
                end: parsedEnd
            };
            dataArray[i] = data;
        }

        // Create dynamic information for the modal
        var title = 'More details for ' + date.date;
        // Display each worklog in a formatted table
        var content = '<table><tr><th>Key</th><th>Worked</th><th>Started</th><th>Ended</th><th class="absorbing-column">Description</th></tr>';
        $.each(dataArray, function(e){
            content += '<tr><td class="pre" align="center"><a href="' + dataArray[e].url + '" target="_blank">' + dataArray[e].id
                + '</a></td><td class="pre" align="center">' + dataArray[e].time + '</td>'+
                '</a></td><td class="pre" align="center">' + dataArray[e].start + '</td>'+
                '</a></td><td class="pre" align="center">' + dataArray[e].end + '</td>'+
                '<td>' + dataArray[e].desc + '</td></tr>'
        });
        content += '</table>';
        if(issue && issue != "") {
            content += "<div><h4>Unusual Logging:</h4></div>";
            content += '<p>' + issue + '</p>';
        }

        // Update the modal's content.
        var modal = $(this);
        modal.find('.modal-title').text(title);
        modal.find('.modal-body').html(content)
    });
});

/*$('input[type=date]').each(function () {
    var $input = $(this);
    var $wrapper = $('<div class="input-group"></div>');
    $wrapper.append('\
        <span class="input-group-btn">\
            <button type="button" class="btn btn-default datetimepicker-clear">\
                <i class="fa fa-times"></i>\
                <span class="sr-only">Clear Date/Time</span>\
            </button>\
            <button type="button" class="btn btn-default datetimepicker-show">\
                <i class="fa fa-calendar"></i>\
                <span class="sr-only">Show Date/Time Selection Control</span>\
            </button>\
        </span>');
    $input.replaceWith($wrapper);
});*/

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}


function update(jscolor) {
    // 'jscolor' instance can be used as a string
    $('#csvbtn').css('background-color', '#' + jscolor);
    $('#full_tbl th').css('background-color', '#' + jscolor);
    $('#task th').css('background-color', '#' + jscolor);
}
