google.charts.load('current', {'packages':['corechart']});

/**
 * Draws each chart in the project.
 */
function drawChart(data) {
    var content = JSON.parse(data.replace(/&quot/g, "\""));

    //starting x-axis value, and ending x-axis value
    var start = new Date(content.start);
    var end = new Date(content.end);

    /* Sets up google data table */
    var tableData = new google.visualization.DataTable();
    tableData.addColumn('date', 'Date');
    tableData.addColumn('number', 'Story Points');
    var array = [
        [start, 0],
        //We need this because it's an area graph
        [new Date(content.timedate[0]), 0]
    ];

    /* Adds up story points and adds to data table */
    var storypointMap = new Map();
    for(var i = 0; i < content.timedate.length; i++) {
        var sum = 0;
        var temp = new Date(content.timedate[i]);
        storypointMap.set(content.key[i], content.value[i]);
        for(var value of storypointMap.values()) {
            sum += value;
        }
        array.push([temp, sum]);
    }
    array.push([end, sum]);
    tableData.addRows(array);

    /* Adds customization to the chart */
    var options = {
        title: 'Story Points', //y axis title
        legend: {position: 'bottom'},
        colors: ['#d04437'], //Line color options
        areaOpacity: 0.0, //If the colored area under the line is displayed
        /* Sets min value for the vertical axis */
        vAxis: { 
            minValue: 0,
            gridlines: {color: 'transparent'},
            format: '#'
        }, 
        hAxis: { 
            format: 'MMM dd',
            /* Sets min and max value for the horizontal axis */
            viewWindow: { 
                min: start,
                max: end
            },
            /* Formats how the horizontal axis labels the dates */
            gridlines: { 
                count: -1,
                color: 'transparent'
            }
        }
    };

    var chart = new google.visualization.SteppedAreaChart(document.getElementById('burndown_section'));
    chart.draw(tableData, options);

    /* Uncomment to make the burndown chart into an image
    $("#burndown_section").html('<img src="' + chart.getImageURI() + '"/>');
    */
}