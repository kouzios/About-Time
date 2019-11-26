google.charts.load('current', {'packages':['corechart']});
//google.charts.setOnLoadCallback(drawChart);

/**
 * This class uses Google Charts to display a plot for each user
 * in a sprint, displaying their total time logged per day in the sprint.
 * @author griggszm@msoe.edu
 * @author kouziosma@msoe.edu
 */

function toHours(time) {
    var d = Number(time);

    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);

    return parseFloat(h + "." + ('0' + m).slice(-2));
}

/**
 * Sets up and returns the basic array for storing data.
 * This is a 2D array. The full array size is the number of days plus one,
 * because there is one entry for each day and one entry to store keys.
 *
 * The sub array length is the number of users, plus one, because each user
 * has a time for every day, and there is also a single date related to each day.
 *
 * @param arraySize     Size of base array
 * @param subArraySize  Size of each sub array (each day)
 * @returns {Array}     Initialized array of data to eventually graph
 */
function setupArray(arraySize,subArraySize) {
    var array = new Array(arraySize);
    for(var j = 0; j < arraySize; j++) {
        array[j] = new Array(subArraySize);
    }
    return array;
}

/**
 * Sets the key for the initial row of array.
 * The first key is always 'Date', then the
 * next keys are each user for the project.
 *
 * @param array         Array of data to eventually graph
 * @param user_array    Array of project users
 */
function setupArrayKeys(array,user_array) {
    array[0][0] = 'Date';
    var j = 1;
    for(var user in user_array) {
        array[0][j] = user;
        j++;
    }
}

/**
 * Fills in each date for each day in the array.
 * This is the first element of every row past the first.
 *
 * @param array Array of data to eventually graph
 * @param dates Array of each day in the range for the project
 */
function fillArrayDates(array, dates) {
    var j = 1;
    for(var date in dates) {
        array[j][0] = date;
        j++;
    }
}

/**
 * Fills in each time for the user, as the project continues.
 *
 * @param array     Array of data to eventually graph
 * @param arraySize Size of the base array
 * @param user_data The data retrieved from pug for this array.
 */
function fillArrayTimes(array, arraySize, user_data) {
    for(var j = 1; j < arraySize; j++) {
        var date = array[j][0];
        var k = 1;
        for(var user in user_data.user_array) {
            var thisTime = projectDailyTime(user, user_data, date);
            if(j>1) {
                // If there is any time data before this, we want a running sum of the times.
                var lastTime = array[j-1][k];
                thisTime = thisTime + lastTime;
            }
            array[j][k] = thisTime;
            k++;
        }
    }
}

/**
 * Converts every time in the array to plot from seconds spent to hours.
 *
 * @param array     Array of data to eventually graph
 * @param arraySize Size of the base array
 * @param user_size Number of users in the project
 */
function converTimeMinutesToHours(array, arraySize, user_size) {
    for(var j = 1; j < arraySize; j++) {
        for(var k = 1; k <= user_size; k++) {
            array[j][k] = toHours(array[j][k]);
        }
    }
}

/**
 * Draws each chart in the project.
 */
function drawChart(data, key) {
    //for each project
    for(proj in data.projects) {
        var user_data = data.projects[proj];

        var dates = data.dateHeader[0].dailyTime; //Index doesn't matter, we just want the pure dates
        var user_size = 0;
        for(u in data.projects[proj].user_array) {
            user_size++;
        }
        //var arraySize = 1+user_data.totalDays; // Add one because we'll have one additional row for Keys, then the rest for data
        var arraySize = 0;
        for(date in dates) {
            arraySize++;
        }
        arraySize += 1;
        var subArraySize = 1+user_size; // Add one because the first entry of the row is the user's username, then the rest are data
        var array = setupArray(arraySize,subArraySize);
        setupArrayKeys(array,user_data.user_array);
        fillArrayDates(array,dates);
        
        fillArrayTimes(array,arraySize,user_data);
        converTimeMinutesToHours(array, arraySize, user_size);

        var tableData = google.visualization.arrayToDataTable(array);

        var options = {
            title: 'Time Spent (hours)', //y axis title
            curveType: 'line', // we don't want it to be a curved graph, by default
            legend: {position: 'bottom'},
            vAxis: {viewWindowMode: "explicit", viewWindow:{ min: 0 }} //prevent the graph from showing negative numbers on the y axis
        };

        var chart = new google.visualization.LineChart(document.getElementById('chart_' + key));
        chart.draw(tableData, options);
    }
}

/**
 * Calculates the daily time for the project for each user
 * 
 * @param {*} name The user
 * @param {*} data The worklogs
 * @param {*} date The current date
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