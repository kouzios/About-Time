require('dotenv').config();
var loadup = require("./services/loadup");
var express = require('express');
var app = express();
//var authentication = require('./services/simpleauthentication');
var bodyParser = require('body-parser');
var confluence = require('./services/confluence');
var cookieParser = require('cookie-parser');
var csvWriter = require('csv-write-stream');
var fs = require('fs');
var logger = require('./lib/logging');
var mime = require('mime');
var pdf = require('html-pdf');
var repo = require('./services/repo');
var Organization = require('./models/organization');
var orgloader = require('./middleware/orgloader');
var historyUpdater = require('./middleware/history');
var path = require('path');
var statusReport = require('./services/statusReport');
var t = require("./services/timelogged");
var audit=require("./services/audit.js");
var filtertime=require("./services/filtertime.js");
var request=require("./services/request.js");
var requestLib = require('request');
var _ = require('underscore');
var moment = require('moment');
var separate = require("./services/separateProjects.js");


app.set('view engine', 'pug');
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '10mb'}));
app.use(cookieParser());
app.use(orgloader.run);
app.use(historyUpdater.run);
app.use(express.static('public'));

/**
 * A webhook that is executed when an organization installs this plugin on their instance.
 */
app.post('/installed', function (req, res) {
    // FIXME: don't rely on /wiki at the end of baseUrl! Confluence urls can end in something else. Use req.body.productType to determine if it's confluence or jira
    var new_client;
    if (!req.body.baseUrl.endsWith("/wiki")) {
        new_client = new Organization({
            client_key: req.body.clientKey,
            public_key: req.body.publicKey,
            jira_shared_secret: req.body.sharedSecret,
            confluence_shared_secret: "", // JIRA installed
            server_version: req.body.serverVersion,
            plugins_version: req.body.pluginsVersion,
            base_url: req.body.baseUrl
        });

        logger.debug("Your client key is: " + new_client.client_key);
        logger.debug("Your jira secret key is: " + new_client.jira_shared_secret);
        logger.debug("Your base url is:", new_client.base_url);
        logger.debug("Your public key is:", new_client.public_key);

        new_client.insert().then(function (db_results) {
            res.status(204).send();
            logger.debug("%s installed MSOE Timer Logger!", new_client.base_url);

        }).catch(function (err) {
            console.log(err);
            logger.error(new_client.base_url + " " + err.message);
            console.log(err.message);
            res.status(500).send();
        });
    } else {
        new_client = new Organization({
            client_key: req.body.clientKey,
            public_key: req.body.publicKey,
            jira_shared_secret: "",
            confluence_shared_secret: req.body.sharedSecret, // JIRA installed
            server_version: req.body.serverVersion,
            plugins_version: req.body.pluginsVersion,
            base_url: req.body.baseUrl.slice(0, -5) // remove "/wiki" from end of base url
        });

        logger.debug("Your base url is:", new_client.base_url);

        new_client.setConfluenceKey().then(function (db_results) {
            res.status(204).send();
            logger.debug("%s created Confluence secret key", new_client.base_url);

        }).catch(function (err) {
            logger.error(new_client.base_url + " " + err.message);
            console.log(err.message);
            res.status(500).send();
        });
    }
});

app.post('/uninstalled', function (req, res) {
    res.status(204).send();
    if(req.body.productType == 'jira') {
        var existing_client = new Organization({
            client_key: req.body.clientKey,
            public_key: req.body.publicKey,
            jira_shared_secret: req.body.sharedSecret,
            confluence_shared_secret: "",
            server_version: req.body.serverVersion,
            plugins_version: req.body.pluginsVersion,
            base_url: req.body.baseUrl
        });
        logger.debug("Deleting entry where: ");
        logger.debug("    Client key is: " + existing_client.client_key);
        logger.debug("    Secret key is: " + existing_client.shared_secret);
        logger.debug("    Base url is: ", existing_client.base_url);
        logger.debug("    Public key is: ", existing_client.public_key);

        existing_client.remove().then(function (db_results) {
            res.status(204).send();
            logger.debug("%s uninstalled MSOE Timer Logger!", existing_client.base_url);
        }).catch(function (err) {
            console.log(err.message);
            logger.error("%s : Error Uninstalling : %s", existing_client.base_url, err.message);
            res.status(500).send();
        });
    }else {
        logger.debug("Removing confluence key from entry where: ");
        logger.debug("    Base url is: ", req.body.baseUrl);
        let base_url = /^(.*?\.atlassian\.net).*/.exec(req.body.baseUrl)[1] + '%';
        let response = repo.query('UPDATE organization SET confluence_shared_secret = ? WHERE base_url like ? and deleted_at is NULL order by updated_at desc LIMIT 1;',
            ['', base_url]);
        response.then(function(){
            res.status(204).send();
            logger.debug("%s uninstalled MSOE Timer Logger from Confluence!", existing_client.base_url);
        }).catch(function (err) {
            console.log(err.message);
            logger.error("%s : Error Uninstalling from Confluence: %s", existing_client.base_url, err.message);
            res.status(500).send();
        });
    }
});

app.post('/enabled', function (req, res) {
    res.status(204).send();
});

app.post('/disabled', function (req, res) {
    res.status(204).send();
});

app.get('/main', function (req, res) {
    var recentNum = 0; // default number of
    renderIndex(req, res, {recentNum: recentNum});
});

app.get('/', function (req, res) {
    res.send('Hello World!<br>Hey look! A version number: 1.3.2<br> Add /main to the url!');
});

app.post('/allProjects', function (req, res) {
    loadup.loadPL(req, req.body.recent).then(function (results) {
        res.send({projects: results});
    });
});

app.post("/getTableResults", function(req, res){
    var sprint_array = loadup.getSprintArray();

    res.send(sprint_array);
});

app.post("/timeresultsForSprint", function (req, res) {
    var sprint_array = loadup.getSprintArray();
    if(!req.body.refreshing) {
        var projectName = req.body.projectList.split(',')[1];
        var sprint = req.body.sprintList;
        var current = req.body.projectList.split(',');
    } else {
        var projectName = req.body.projectName;
        var sprint = req.body.sprint;
        var current = [];
        current[0] = req.body.current0;
        current[1] = req.body.current1;
    }

    res.cookie('pn' , {name: current[1], key: current[0], sprint: sprint}, {expires: moment().add(1, 'months').toDate()});
    if(req.cookies['pn']){
        req.cookies['pn'].name=current[1];
        req.cookies['pn'].key=current[0];
        req.cookies['pn'].sprint=sprint;
    }
    let dateDifference;
    /**
     * Get the current server time from the REST API and get the difference to UTC time
     * @author jacksonbrant@msoe.edu
     */
    request.getServerInfo(req).then(function (results) {
        let serverDate = moment(JSON.parse(results).serverTime);
        //Get the date that jira's servers are on (UTC) and get the difference so that the proper date can be displayed
        //TODO this might need changing if Jira doesn't change its time on daylight savings
        //Unfortunately we could not test that because this was written in April
        let jiraDate = moment(serverDate.toISOString().substring(0, 23));//0 to 23 cuts off the z at the end ?

        //the difference in the server date and the jira date Should be around 18000000 for central time
        dateDifference = jiraDate.diff(serverDate);
    }).then(function () {
        var startdate, enddate, momentStartDate, momentEndDate;
        if (sprint_array !== undefined) {
            for (var i = 0; i < sprint_array.length; i++) {
                if (sprint_array[i].sprint.name === sprint) {
                    startdate = sprint_array[i].sprint.startDate;
                    enddate = sprint_array[i].sprint.endDate;
                }
            }
        }

        if(startdate && enddate) {
            //Convert startdate and endDate to local time by subtracting the dateDifference
            momentStartDate = moment(startdate.substring(0, 23));
            momentStartDate = moment(momentStartDate - dateDifference);
            startdate = momentStartDate.toISOString(true);

            momentEndDate = moment(enddate.substring(0, 23));
            momentEndDate = moment(momentEndDate - dateDifference);
            enddate = momentEndDate.toISOString(true);
        }

        var start, end, formatted_start, formatted_end, filename;
        if (req.body.usingSprintForm === "true") {
            if(enddate == undefined || startdate == undefined) {
                renderIndex(req, res, {error: "Cannot view time log for a non-started sprint."});
                return;
            }
            start = startdate.substring(0, 10);
            end = enddate.substring(0, 10);
            formatted_start = start.substring(5, 7) + "/" + start.substring(8, 10) + "/" + start.substring(0, 4);
            formatted_end = end.substring(5, 7) + "/" + end.substring(8, 10) + "/" + end.substring(0, 4);
            filename = __dirname + '/' + projectName.toUpperCase() + '-' + start + '.csv';
        } else {
            formatted_start = req.body.from;
            start = formatted_start.substring(6, 10) + "-" + formatted_start.substring(0, 2) + "-" + formatted_start.substring(3, 5);
            formatted_end = req.body.to;
            end = formatted_end.substring(6,10) + "-" + formatted_end.substring(0,2) + "-" + formatted_end.substring(3,5);
            filename = __dirname + '/' + projectName.toUpperCase() + '-' + formatted_start + '.csv';
        }

        req.body.startDateInput = momentStartDate;

        t.getTasks(req, projectName, start, end).then(function (results) {
            if(req.body.usingSprintForm === 'true') {
                results = filtertime.filterTimeOutsideDates(results, startdate, enddate, start, end);
                var timesText1 = momentStartDate.format('h:mm A');
                var timesText2 = momentEndDate.format('h:mm A');
            }
            audit.report_errors(results['user_array'], results['task_array']);
            res.cookie('from' , req.body.from, {expires: moment().add(1, 'months').toDate()});
            res.cookie('to' , req.body.to, {expires: moment().add(1, 'months').toDate()});
            res.cookie('usingSprintForm', req.body.usingSprintForm, {expires: moment().add(1, 'months').toDate()});
            res.cookie('allProjectsChecked', req.body.showAllProjects, {expires: moment().add(1, 'months').toDate()});
            res.cookie('sprintList', req.body.sprintList, {expires: moment().add(1, 'months').toDate()});
            // console.log(results) if this if-statement fails. Something is undefined
            if (results && results.user_array && results.task_array && results.user_array[Object.keys(results.user_array)[0]]) {
                return res.render('custom', {
                    title: 'About Time Log Viewer',
                    alljs: req.jwt.base_url + "/atlassian-connect/all.js",
                    message1: formatted_start,
                    message2: formatted_end,
                    times1: timesText1,
                    times2: timesText2,
                    user: results.user_array,
                    task: results.task_array,
                    sorted_usernames: results.sorted_usernames,
                    dateHeader: results.user_array[Object.keys(results.user_array)[0]],
                    totalDays: results.totalDays,
                    host: encodeURIComponent(req.jwt.base_url),
                    file: filename,
                    usingSprintForm: req.body.usingSprintForm,
                    to: req.body.to,
                    from: req.body.from,
                    projectName: projectName,
                    sprint: sprint,
                    current0: current[0],
                    current1: current[1],
                    startDateInput: start,
                    endDateInput: end
                });
            } else {
                renderIndex(req, res, {error: "No time log for specified date range."});
                logger.debug("%s - %s", req.jwt.base_url, "No time log for specified date range.");
            }
        }).catch(function (err) {
            renderIndex(req, res, {error: "An error has occurred. Please try again later."});
            logger.error("%s - %s", req.jwt.base_url, err.message);
        });
    });
});

app.post("/useDateRange", function (req, res) {
    var sprint_array = loadup.getSprintArray();
    if (!req.body.refreshing) {
        var projectName = req.body.projectList.split(',')[1];
        var sprint = req.body.sprintList;
        var current = req.body.projectList.split(',');
    } else {
        var projectName = req.body.projectName;
        var sprint = req.body.sprint;
        var current = [];
        current[0] = req.body.current0;
        current[1] = req.body.current1;
    }
    var startDateInput = req.body.startDateInput;
    var endDateInput = req.body.endDateInput;
    res.cookie('pn', { name: current[1], key: current[0], sprint: sprint }, { expires: moment().add(1, 'months').toDate() });
    if (req.cookies['pn']) {
        req.cookies['pn'].name = current[1];
        req.cookies['pn'].key = current[0];
        req.cookies['pn'].sprint = sprint;
    }
    /**
     * Get the current server time from the REST API and get the difference to UTC time
     * @author jacksonbrant@msoe.edu
     */
    request.getServerInfo(req).then(function (results) {
        let serverDate = moment(JSON.parse(results).serverTime);
        //Get the date that jira's servers are on (UTC) and get the difference so that the proper date can be displayed
        //TODO this might need changing if Jira doesn't change its time on daylight savings
        //Unfortunately we could not test that because this was written in April
        let jiraDate = moment(serverDate.toISOString().substring(0, 23));//0 to 23 cuts off the z at the end ?

        //the difference in the server date and the jira date Should be around 18000000 for central time
        dateDifference = jiraDate.diff(serverDate);
    }).then(function () {
        var startdate;
        var enddate;
        if (startDateInput == "" || endDateInput == "") {
            if (sprint_array !== undefined) {
                for (var i = 0; i < sprint_array.length; i++) {
                    if (sprint_array[i].sprint.name === sprint) {
                        startdate = sprint_array[i].sprint.startDate;
                        enddate = sprint_array[i].sprint.endDate;
                    }
                }
            }
        } else if (startDateInput != "" && endDateInput != "") {
            if (sprint_array !== undefined) {
                for (var i = 0; i < sprint_array.length; i++) {
                    if (sprint_array[i].sprint.name === sprint) {
                        var endStarting = endDateInput.substring(0, 10);
                        var endEnding = "T23:23:23";//sprint_array[i].sprint.endDate.substring(10, 23);
                        startdate = startDateInput;
                        enddate = endStarting + endEnding;
                    }
                }
            }

        }
        //Convert startdate and endDate to local time by subtracting the dateDifference
        let momentStartDate = moment(startdate.substring(0, 23));
        momentStartDate = moment(momentStartDate);
        startdate = momentStartDate.toISOString(true);

        let momentEndDate = moment(enddate.substring(0, 23));
        momentEndDate = moment(momentEndDate);
        enddate = momentEndDate.toISOString(true);

        var start, end, formatted_start, formatted_end, filename;
        if (req.body.usingSprintForm === "true") {
            if (enddate == undefined || startdate == undefined) {
                renderIndex(req, res, { error: "Cannot view time log for a non-started sprint." });
                return;
            }
            start = startdate.substring(0, 10);
            end = enddate.substring(0, 10);
            formatted_start = start.substring(5, 7) + "/" + start.substring(8, 10) + "/" + start.substring(0, 4);
            formatted_end = end.substring(5, 7) + "/" + end.substring(8, 10) + "/" + end.substring(0, 4);
            filename = __dirname + '/' + projectName.toUpperCase() + '-' + start + '.csv';
        } else {
            formatted_start = req.body.from;
            start = formatted_start.substring(6, 10) + "-" + formatted_start.substring(0, 2) + "-" + formatted_start.substring(3, 5);
            formatted_end = req.body.to;
            end = formatted_end.substring(6, 10) + "-" + formatted_end.substring(0, 2) + "-" + formatted_end.substring(3, 5);
            filename = __dirname + '/' + projectName.toUpperCase() + '-' + formatted_start + '.csv';
        }
        
        req.body.startDateInput = momentStartDate;

        t.getTasks(req, projectName, start, end).then(function (results) {
            if (req.body.usingSprintForm === 'true') {
                results = filtertime.filterTimeOutsideDates(results, startdate, enddate, start, end);
                var timesText1 = momentStartDate.format('h:mm A');
                var timesText2 = momentEndDate.format('h:mm A');
            }
            audit.report_errors(results['user_array'], results['task_array']);
            res.cookie('from', req.body.from, { expires: moment().add(1, 'months').toDate() });
            res.cookie('to', req.body.to, { expires: moment().add(1, 'months').toDate() });
            res.cookie('usingSprintForm', req.body.usingSprintForm, { expires: moment().add(1, 'months').toDate() });
            res.cookie('allProjectsChecked', req.body.showAllProjects, { expires: moment().add(1, 'months').toDate() });
            res.cookie('sprintList', req.body.sprintList, { expires: moment().add(1, 'months').toDate() });
            // console.log(results) if this if-statement fails. Something is undefined
            if (results && results.user_array && results.task_array && results.user_array[Object.keys(results.user_array)[0]]) {
                return res.render('custom', {
                    title: 'About Time Log Viewer',
                    alljs: req.jwt.base_url + "/atlassian-connect/all.js",
                    message1: formatted_start,
                    message2: formatted_end,
                    times1: timesText1,
                    times2: timesText2,
                    user: results.user_array,
                    task: results.task_array,
                    sorted_usernames: results.sorted_usernames,
                    dateHeader: results.user_array[Object.keys(results.user_array)[0]],
                    totalDays: results.totalDays,
                    host: encodeURIComponent(req.jwt.base_url),
                    file: filename,
                    usingSprintForm: req.body.usingSprintForm,
                    to: req.body.to,
                    from: req.body.from,
                    projectName: projectName,
                    sprint: sprint,
                    current0: current[0],
                    current1: current[1],
                    startDateInput: start,
                    endDateInput: end
                });
            } else {
                renderIndex(req, res, { error: "No time log for specified date range." });
                logger.debug("%s - %s", req.jwt.base_url, "No time log for specified date range.");
            }
        }).catch(function (err) {
            renderIndex(req, res, { error: "An error has occurred. Please try again later." });
            logger.error("%s - %s", req.jwt.base_url, err.message);
        });
    });
});

app.get('/gadgetmain', function (req, res) {
    // If cookie doesn't exist, display main page
    loadup.loadPL(req).then(function (results1) {
        if (typeof req.cookies.pn === 'undefined') {
            res.render('index-gadget', {
                title: 'About Time Log Viewer',
                project: results1.project_array,
                host: encodeURIComponent(req.jwt.base_url),
                alljs: req.jwt.base_url + "/atlassian-connect/all.js",
                pn: req.cookies.pn
            });
        } else {
            // If cookie exists, display saved project
            loadup.getSprintInfo(req, req.cookies.pn).then(function () {
                // Sprint data
                var sprint_array = loadup.getSprintArray();
                // Format date to display on top of page
                var startdate = sprint_array[sprint_array.length - 1].sprint.startDate;
                var enddate = sprint_array[sprint_array.length - 1].sprint.endDate;
                var start = startdate.substring(0, 10);
                var end = enddate.substring(0, 10);

                var pn = req.cookies.pn;
                var formatted_start = start.substring(5, 7) + "/" + start.substring(8, 10) + "/" + start.substring(0, 4);
                var formatted_end = end.substring(5, 7) + "/" + end.substring(8, 10) + "/" + end.substring(0, 4);
                // Populate table
                t.getTasks(req, pn, start, end).then(function (results) {
                    // console.log(results) if this if-statement fails. Something is undefined
                    if (results && results.user_array && results.task_array && results.user_array[Object.keys(results.user_array)[0]]) {
                        return res.render('gadget', {
                            title: 'MSOE Time Logger',
                            alljs: req.jwt.base_url + "/atlassian-connect/all.js",
                            pnmessage: pn,
                            message: formatted_start + ' - ' + formatted_end,
                            user: results.user_array,
                            task: results.task_array,
                            sprintlist: sprint_array,
                            dateHeader: results.user_array[Object.keys(results.user_array)[0]],
                            totalDays: results.totalDays,
                            host: encodeURIComponent(req.jwt.base_url)
                        });
                    } else {
                        res.render('index-gadget', {
                            title: 'MSOE Time Logger',
                            host: encodeURIComponent(req.jwt.base_url),
                            alljs: req.jwt.base_url + "/atlassian-connect/all.js",
                            error: "An error has occured. Please try again later."
                        });

                        logger.debug("%s - %s", req.jwt.base_url, "No time log for specified date range.");
                    }
                }).catch(function (err) {
                    res.render('index-gadget', {
                        title: 'MSOE Time Logger',
                        host: encodeURIComponent(req.jwt.base_url),
                        alljs: req.jwt.base_url + "/atlassian-connect/all.js",
                        error: "An error has occured. Please try again later."
                    });

                    logger.error("%s - %s", req.jwt.base_url, err.message);
                });
            })
        }
    }).catch(function (err) {
        renderIndex(req, res, {error: "An error has occurred. Please try again later."});
        logger.error("%s - %s", req.jwt.base_url, err.message);
    })
});

app.post("/getInfoForOtherSprint", function (req, res) {
    var sprintname = req.body.sprintList;
    var pn = req.cookies.pn;
    var sprint_array = loadup.getSprintArray();
    var startdate;
    var enddate;

    for (var count in sprint_array) {
        if (sprint_array[count].sprint.name === sprintname) {
            startdate = sprint_array[count].sprint.startDate;
            enddate = sprint_array[count].sprint.endDate;
        }
    }

    // Format date to display on top of page
    var start = startdate.substring(0, 10);
    var end = enddate.substring(0, 10);
    var formatted_start = start.substring(5, 7) + "/" + start.substring(8, 10) + "/" + start.substring(0, 4);
    var formatted_end = end.substring(5, 7) + "/" + end.substring(8, 10) + "/" + end.substring(0, 4);

    t.getTasks(req, pn, start, end).then(function (results) {
        //console.log(results) //if this if-statement fails. Something is undefined
        if (results && results.user_array && results.task_array && results.user_array[Object.keys(results.user_array)[0]]) {
            return res.render('gadget', {
                title: 'MSOE Time Logger',
                alljs: req.jwt.base_url + "/atlassian-connect/all.js",
                pnmessage: pn,
                message: formatted_start + ' - ' + formatted_end,
                user: results.user_array,
                task: results.task_array,
                sprintlist: sprint_array,
                dateHeader: results.user_array[Object.keys(results.user_array)[0]],
                totalDays: results.totalDays,
                host: encodeURIComponent(req.jwt.base_url)
            });
        } else {
            renderIndex(req, res, {error: "An error has occurred. Please try again later."});
            logger.debug("%s - %s", req.jwt.base_url, "No time log for specified date range.");
        }
    }).catch(function (err) {
        renderIndex(req, res, {error: "An error has occurred. Please try again later."});
        logger.error("%s - %s", req.jwt.base_url, err.message);
    });
});

/**
 * Generates report, downloads it, and removes it from server.
 * Referenced in /timeresults Export CSV button
 **/
app.post('/download', function (req, res) {
    var file = req.body.filename; // Report filepath
    var dataForCSV = []; // Array for writing data to csv
    var headerForCSV = ['User', 'Total'];
    var dateHeader = JSON.parse(req.body.dateHeader); // dateHeader from /timeresults
    var user = JSON.parse(req.body.user); // User array from /timeresults
    var totalDays = req.body.totalDays;
    // Iterate thru and add dates to the csv header
    _.each(dateHeader, function (date) {
        _.each(date, function (task) {
            if (task.date != undefined && task.date != null)
                headerForCSV.push(task.date);
        })
    });
    // Buffer for task information just incase small date range
    for (i = 0; i < 5; i++) {
        headerForCSV.push('')
    }
    // Write user data (influenced by table in custom.pug)
    var writer = csvWriter({headers: headerForCSV});
    writer.pipe(fs.createWriteStream(file));
    _.each(user, function (user) {
        dataForCSV.push(user.name);
        dataForCSV.push(user.totalTime);
        _.each(user.dailyTime, function (dt) {
            if (dt.timeSpent > 0) {
                dataForCSV.push(dt.timeSpent)
            } else {
                dataForCSV.push('')
            }
        });
        writer.write(dataForCSV);
        dataForCSV = [];
    });
    // Daily hours total
    dataForCSV.push('Daily hours total:');
    dataForCSV.push('');
    _.each(dateHeader.dailyTime, function (d) {
        var dailyTotal = 0;
        _.each(user, function (user) {
            _.each(user.dailyTime, function (dt) {
                // Iterate thru all user daily time and sum daily total
                if (dt.date === d.date)
                    dailyTotal += dt.timeSpentSeconds
            })
        });
        // If no work completed on a given day, print '' | else print calculated total for all dataForCSV
        if (dailyTotal === 0) {
            dataForCSV.push('')
        } else {
            if (dailyTotal % 3600 === 0)
                dataForCSV.push((dailyTotal / 3600).toFixed(0));
            else
                dataForCSV.push((dailyTotal / 3600).toFixed(2));
        }
    });
    writer.write(dataForCSV);
    dataForCSV = [];
    // Weekly hours total
    dataForCSV.push('Weekly hours total:');
    dataForCSV.push('');
    var count = 1; // Used to print if range doesn't end on a Sunday
    // Iterate thru every date once (dateHeader)
    _.each(dateHeader.dailyTime, function (d) {
        var weeklyTotal = 0;
        // Iterate thru all user daily time and sum to weekly total if day is in week
        _.each(user, function (user) {
            _.each(user.dailyTime, function (dt) {
                if (dt.endOfWeek.week === d.endOfWeek.week)
                    weeklyTotal += dt.endOfWeek.weekTime
            })
        });
        // If day is a Sunday, print out weekly total | else if not Sunday, but last day in range print total
        if (d.endOfWeek.week === d.date || count === totalDays) {
            if (weeklyTotal / 3600 > 0) {
                if (weeklyTotal % 3600 === 0)
                    dataForCSV.push((weeklyTotal / 3600).toFixed(0));
                else
                    dataForCSV.push((weeklyTotal / 3600).toFixed(2));
            } else {
                dataForCSV.push('');
            }
        } else {
            dataForCSV.push('');
        }
        count++;
    });
    writer.write(dataForCSV);
    writer.write('\n\n');
    writer.write(['User', 'Date', 'Log Created', 'Key', 'Time (h)', 'Description']);
    // Write worklog information (influenced by custom.js)
    _.each(user, function (user) {
        _.each(user.dailyTime, function (dt) {
            var url = dt.url; // URL for issues
            var wlogid = dt.worklogs.id; // The key for each worklog
            var wlogtime = dt.worklogs.time; // The time for each worklog
            var wlogdesc = dt.worklogs.desc; // The comment for each worklog
            if(dt.worklogs.created){
                var wlogcreated = dt.worklogs.created;
                for(var j = 0; j < wlogcreated.length; j++){
                    var date = new Date(wlogcreated[j]);
                    wlogcreated[j] = (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear()
                }
            }


            var dataArray = []; // Store each worklog data as an object
            for (var i = 0; i < url.length; i++) {
                // Format time in hours
                var t = wlogtime[i] / 3600;
                if (wlogtime[i] % 3600 === 0)
                    t = t.toFixed(0);
                else
                    t = t.toFixed(2);
                var data = {
                    id: wlogid[i],
                    time: t,
                    desc: wlogdesc[i],
                    date: dt.date,
                    created: wlogcreated[i]
                };
                dataArray[i] = data;
            }
            _.each(dataArray, function (e) {
                writer.write([user.name, e.date, e.created, e.id, e.time, e.desc]);
            });
        })
    });
    writer.end();

    // Make file auto-downloadable by setting attributes
    var filename = path.basename("timelog.csv");
    var mimetype = mime.lookup(file);

    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', mimetype);

    // Download file and then delete from server to keep file structure neat
    var filestream = fs.createReadStream(file);
    filestream.pipe(res);
    try {
        fs.unlinkSync(file);
    }
    catch(err) {
        // ignore file not found error
    }
});


// This will allow us to host files statically like with `http-server`
app.use(express.static('public'));

app.listen(8081, function () {
    console.log('App listening on port 8081!');
});

app.post('/populateSprintList', function (req, res) {
    var projectKey = req.body.project.split(',')[0];
    loadup.getSprintInfo(req, projectKey).then(function (results) {
        res.send({sprint: results});
    });
});

app.post('/populateSpaces', function(req, res) {
    statusReport.getSpaces(req).then(function(results){
        var spaces = [];
        _.each(results['results'], function(e){
            spaces.push({
                id: e.id,
                key: e.key,
                name: e.name
            })
        });
        return res.send(spaces);
    });
});

app.post('/getAllStatusReports', function (req, res) {
    var parentID = req.body.parent;
    confluence.getDescendantPages(req, parentID).then(function (results) {
        res.send({descendants: results});
    });
});

/**
 * get the start and end date for the currently selected sprint
 * This is needed for the status report generator
 * @author jacksonbrant@msoe.edu
 */
app.post('/getStartAndEndDate', function (req, res) {
    var sprint = req.body.sprint;
    var sprint_array = loadup.getSprintArray();
    var start;
    var end;
    if (sprint_array !== undefined) {
        for (var i = 0; i < sprint_array.length; i++) {
            if (sprint_array[i].sprint.name === sprint) {
                start = sprint_array[i].sprint.startDate;
                end = sprint_array[i].sprint.endDate;
            }
        }
    }
    res.send({start:start,end:end});
});

/**
 * Creates a new status report by generating the HTML in services/statusReport.js
 * Then it either saves the HTML for the preview, or sends it to the appropriate confluence page
 */
app.post('/createNewStatusReport', function (req, res) {
    res.status(200);
    var sprint = req.body.sprint;
    var sprint_array = loadup.getSprintArray();
    var confluenceKey = req.body.confluenceKey;
    var burndowndata = req.body.burndowndata;
    var projectKey = req.body.project.split(',')[0];
    var projectName = req.body.project.split(',')[1];
    var start, end, formatted_start, formatted_end;
    if (req.body.usingSprintForm === "true") {
        if(req.body.weeks[0] === "sprint") {
            try {
                var result = statusReport.createNameAndGetStartAndEndData(req, projectKey);
            } catch (e) {
                res.status(400);
                res.send({error: "Can't create report of unstarted sprint!"});
                return;
            }
            name = result.name;
            start = result.start.toString();
            end = result.end.toString();
            formatted_start = start.substring(5, 7) + "/" + start.substring(8, 10) + "/" + start.substring(0, 4);
            formatted_end = end.substring(5, 7) + "/" + end.substring(8, 10) + "/" + end.substring(0, 4);
        } else {
            try {
                statusReport.createNameAndGetStartAndEndData(req, projectKey);
            } catch (e) {
                res.status(400);
                res.send({error: "Can't create report of unstarted sprint!"});
                return;
            }

            //variable to check if the last week was checked.
            //This allows for multiple weeks to be checked
            let lastWeek = false;
            let startingWeek;
            for(let i=0; i<req.body.numWeeks; i++){
                if(req.body.weeks[i] !== null && !lastWeek){
                    start = req.body.weeks[i][0].substring(0, 10);
                    end = req.body.weeks[i][1].substring(0, 10);
                    startingWeek = i+1;
                    name = req.body.sprint + " Week " + (startingWeek) + " Status Report";
                    formatted_start = start.substring(5, 7) + "/" + start.substring(8, 10) + "/" + start.substring(0, 4);
                    formatted_end = end.substring(5, 7) + "/" + end.substring(8, 10) + "/" + end.substring(0, 4);
                    lastWeek = true;
                } else if(req.body.weeks[i] !== null && lastWeek){
                    end = req.body.weeks[i][1].substring(0, 10);
                    formatted_end = end.substring(5, 7) + "/" + end.substring(8, 10) + "/" + end.substring(0, 4);
                    name = req.body.sprint + " Weeks " + startingWeek + "-" + (i+1) + " Status Report"
                } else if (lastWeek){
                    break;
                }
            }
        }
    } else {
        formatted_start = req.body.from;
        start = formatted_start.substring(6, 10) + "-" + formatted_start.substring(0, 2) + "-" + formatted_start.substring(3, 5);
        formatted_end = req.body.to;
        end = formatted_end.substring(6, 10) + "-" + formatted_end.substring(0, 2) + "-" + formatted_end.substring(3, 5);
        name = "Status Report " + formatted_start + " - " + formatted_end;
    }

    t.getTasks(req, projectKey, start, end).then(function (results) {
        statusReport.makeReport(req, projectKey, confluenceKey, formatted_start, formatted_end, name, results, req.query.preview, burndowndata).then(function (url) {
            res.cookie('pn' , {name: projectName, sprint: sprint}, {expires: moment().add(1, 'months').toDate()});
            if(req.cookies['pn']){
                req.cookies['pn'].name=projectName;
                req.cookies['pn'].key=projectKey;
                req.cookies['pn'].sprint=sprint;
            }
            res.send({url:url,name:name});
        });
    });
});

/**
 * generates a status report given the html in the preview
 * sends the html to confluence
 * @author jacksontbrant
 */
app.post('/generateReportFromPreview', function (req, res) {
    var confluenceKey = req.body.confluenceKey;
    var html = req.body.html;
    var name = req.body.name;
    statusReport.sendReport(req, confluenceKey, name, html).then(function (url) {
        res.send({url:url,name:name});
    });
});

/**
 * Gets the board ID, Jira URL, and etc
 * 
 * @author kouziosma@msoe.edu
 */
app.get('/get-jira-info', function(req, res) {
    var project = req.query.project.split(",");
    var keys = [project[0]];
    var projs = [project[1]];
    var sprintID;

    getSprintInfo(req, keys, projs, function(results){
        for(var i = 0; i < results.sprints[0].length; i++) {
            if(results.sprints[0][i].sprint.name == req.query.selectedSprint) {
                sprintID = results.sprints[0][i].sprint.id
            }
        }
        if(sprintID) {
            request.getboardidfromprojectkey(req, project[0], 0).then(function (results) {
                var data = JSON.parse(results);
                var boardID = data.values[0].id;
                var sprintIDInteger = sprintID;
                var url = req.jwt.base_url + '/rest/greenhopper/1.0/rapid/charts/scopechangeburndownchart.json?rapidViewId=' + boardID + '&sprintId=' + sprintIDInteger;
                options = {
                    url: url,
                    method: 'GET',
                    headers: {
                        'Authorization': "Basic " + Buffer.from(process.env.JIRA_USERNAME + ":" + process.env.JIRA_PASSWORD).toString('base64'),
                        'X-Atlassian-Token': 'no-check'
                    }
                };
                requestLib(options, function(error, response, body) {
                    if(error) {
                        res.send("ERROR");
                    }
                    res.send({
                        burndownData: body
                    })
                });
            });
        } else {
            res.send("ERROR");
        }
    });
});

app.post('/gadgetendpoint', function (req, res) {
    loadup.getSprintInfo(req, req.body.project.split(',')[1]).then(function (results) {
        res.send({sprint: results});
    });
});

/**
 * This endpoint creates an issue on the bitbucket repository using the data passed from the client
 * @author sullivan-bormannaj
 */
app.post('/submitAnIssue', function (req, res) {
    loadup.postIssue(req).then(function (results){
        if(results.toLowerCase().indexOf("error") === -1){
            res.send({success: results})
        } else{
            res.send({error: results});
        }
    });
});

/**
 * This post creates and renders a PDF containing data from the view logs time table
 * The purpose of this is the provide an easy method of printing and/or storing data from a sprint
 */
app.post('/printPreview', function (req, res) {
    //Variables containing user data and time data are set up here
    let user = JSON.parse(req.body.user);
    let sorted_usernames = Object.keys(user).sort();
    let list = user[sorted_usernames[0]];
    let tables = [], count = 0, current_table = {};
    let dateHeader = JSON.parse(req.body.dateHeader);
    //Gets the necessary time data for the tables
    for (let key of Object.keys(list.dailyTime)) {
        if(count >= user[sorted_usernames[0]]['dailyTime'].length)
            break;
        count++;
        current_table['dateHeader'] = current_table['dateHeader'] || {'dailyTime': {}};
        let temp = dateHeader['dailyTime'][key];
        current_table['dateHeader']['dailyTime'][key] = temp;
        for(let username of sorted_usernames) {
            current_table[username] = current_table[username] || {
                name: user[username]['name'],
                avatarUrls: user[username]['avatarUrls'],
                totalTime: user[username]['totalTime'],
                overheadTime: user[username]['overheadTime'],
                dailyTime: {}  // user[username]['dailyTime'].slice(count, count + 21)

            };
            current_table[username]['dailyTime'][key] = user[username]['dailyTime'][key];
        }
        if(count % 21 === 0) {
            tables.push(current_table);
            current_table = {};
        }
    }
    if (!_.isEmpty(current_table)) {
        tables.push(current_table);
    }
    //Some more variables are set up here
    var projectName = req.body.projectName;
    var startdate;
    var enddate;
    var sprint = req.body.sprint;
    var sprint_array = loadup.getSprintArray();
    var startDateInput = req.body.startDateInput;
    var endDateInput = req.body.endDateInput;

    //If custom dates where not inputted
    if (startDateInput == "" || endDateInput == "") {
        if (sprint_array !== undefined) {
            for (var i = 0; i < sprint_array.length; i++) {
                if (sprint_array[i].sprint.name === sprint) {
                    startdate = sprint_array[i].sprint.startDate;
                    enddate = sprint_array[i].sprint.endDate;
                }
            }
        }
    //If custom dates where inputted (PDF doesn't yet work with custom dates)
    } else if (startDateInput != "" && endDateInput != "") {
        if (sprint_array !== undefined) {
            for (var i = 0; i < sprint_array.length; i++) {
                if (sprint_array[i].sprint.name === sprint) {
                    var endStarting = endDateInput.substring(0, 10);
                    var endEnding = "T23:23:23";
                    startdate = startDateInput;
                    enddate = endStarting + endEnding;
                }
            }
        }

    }

    //Convert startdate and endDate to local times
    let momentStartDate = moment(startdate.substring(0, 23));
    momentStartDate = moment(momentStartDate);
    startdate = momentStartDate.toISOString(true);

    let momentEndDate = moment(enddate.substring(0, 23));
    momentEndDate = moment(momentEndDate);
    enddate = momentEndDate.toISOString(true);
    //The start and end dates are parsed to only contain the date data
    start = startdate.substring(0, 4) + "-" + startdate.substring(5, 7) + "-" + startdate.substring(8, 10);
    end = enddate.substring(0, 4) + "-" + enddate.substring(5, 7) + "-" + enddate.substring(8, 10);

    //Handle warnings
    var warningsList = [];
    var theSplit = req.body.pdfWarnings.split("<br>");
    if (theSplit != null) {
        for (let element of theSplit) {
            warningsList.push(element);
        }
    } else {
        warningsList.push("No Warnings");
    }

    t.getTasks(req, projectName, start, end).then(function (results) {
        //Here all the data is assigned to be sent to the print preview page to use
        return res.render('print-preview', {
            tables: tables,
            sorted_usernames: sorted_usernames,
            dateHeader: JSON.parse(req.body.dateHeader),
            task: results.task_array,
            totalDays: results.totalDays,
            healthMetricEnabled1: req.body.healthMetricKey,
            healthMetricEnabled2: req.body.healthMetricWarningsEnabled,
            warnings: warningsList,
            projectTitle: projectName
        }, function (err, html) {
            //The PDF is set up and rendered here
            res.setHeader('Content-disposition', 'attachment; filename=timelog.pdf');
            res.setHeader('Content-type', 'text/pdf');
            pdf.create(html, { orientation: 'landscape', timeout: 300000 }).toBuffer(function (err, buffer) {
                res.send(buffer);
            })
        });
    }).catch(function (err) {
        console.log(err);
        renderIndex(req, res, { error: "An error has occurred. Please try again later." });
        logger.error("%s - %s", req.jwt.base_url, err.message);
    });
});

/**
 * Renders the index page with optional arguments
 *
 * @param req The request object
 * @param res The response object
 * @param kwargs An object which can contain keys 'recentNum' (default 0) and 'error' (default null)
 */
function renderIndex(req, res, kwargs) {
    loadup.loadPL(req, kwargs['recentNum'] || 0).then(function (results) {
        var dormantProjects = [];
        for(var index = results.project_array.length - 1; index >= 0; index--){
            var current = results.project_array[index];
            if(current.name.toLowerCase().indexOf('dormant') !== -1 || (current.projectCategory !== undefined && current.projectCategory.name.toLowerCase().indexOf('dormant') !== -1)){
                dormantProjects.unshift(current);
                results.project_array.splice(index, 1);
            }
        }
        removeInvalidRecentProjects(req.recent, results.project_array);
        if(!req.jwt.confluence_shared_secret) {
            res.render('index', {
                title: 'MSOE Time Log Viewer',
                project: results,
                host: encodeURIComponent(req.jwt.base_url), //"https://msoese.atlassian.net"
                rawHost: req.jwt.base_url,
                alljs: req.jwt.base_url + "/atlassian-connect/all.js", //"https://msoese.atlassian.net"
                recent: req.recent,
                dormant: dormantProjects,
                pn: req.cookies.pn,
                from: req.cookies.from,
                to: req.cookies.to,
                error: kwargs['error'] || null,
                spaces: [],
                has_confluence: false,
            });
        } else {
            statusReport.getSpaces(req).then(function(spaces_results){
                var spaces = [];
                _.each(spaces_results['results'], function(e) {
                    spaces.push({
                        id: e.id,
                        key: e.key,
                        name: e.name,
                        url: req.jwt.base_url + '/wiki' + e._links.webui  // FIXME: I only work with MSOE! We'll have to add a confluence_base_url to do this generically
                    });
                });
                res.render('index', {
                    title: 'MSOE Time Log Viewer',
                    project: results,
                    host: encodeURIComponent(req.jwt.base_url), //"https://msoese.atlassian.net"
                    rawHost: req.jwt.base_url,
                    alljs: req.jwt.base_url + "/atlassian-connect/all.js", //"https://msoese.atlassian.net"
                    recent: req.recent,
                    dormant: dormantProjects,
                    pn: req.cookies.pn,
                    from: req.cookies.from,
                    to: req.cookies.to,
                    error: kwargs['error'] || null,
                    spaces: spaces,
                    has_confluence: true
                });
            });
        }
    });
}

/**
 * Converts passed in date to the valid dateformat used in this project of YYYY-MM-DD
 * @author kouziosma@msoe.edu
 */
function formatDate(d) {
    var mm = d.getMonth() + 1;
    mm = (mm < 10) ? '0' + mm : mm;
    var dd = d.getDate();
    dd = (dd < 10) ? '0' + dd : dd;
    var yyyy = d.getFullYear();
    return yyyy + "-" + mm + "-" + dd;
}

/**
 * Asyncronously handles getting sprint information from the loadup service
 * @author kouziosma@msoe.edu
 */
app.post('/get-sprints-by-key', function(req, res) {
    var projs1 = req.body.projectArray.split(";");
    var length = projs1.length;
    var projs = projs1.slice(0, length-1);
    var keys = [];
    var names = [];

    if(projs.length == 0) {
        res.send(undefined);
    }

    for(var i = 0; i < projs.length; i+=1) {
        var split = projs[i].split(',');
        keys.push(split[0]);
        names.push(split[1]);
    }

    getSprintInfo(req, keys, projs, function(results){
        res.send(results);
    });
});

/**
 * Asyncronously handles getting sprint information from the loadup service
 * 
 * @param req The request needed for getting sprint information
 * @param keys The keys array holding all projects for which data will be retrieved
 * @param callback The callback allowing data to be passed back to the function that called this
 * @author kouziosma@msoe.edu
 */
function getSprintInfo(req, keys, projs, callback) {
    var sprints = [];
    var keys_array = [];
    var projects_array = [];
  
    let count = 0;
    let altcount = 0;
    keys.forEach(function() {
        var key = keys[altcount];
        var proj = projs[altcount];
        loadup.getSprintInfo(req, key).then(function (results) {
            sprints.push(results);
            keys_array.push(key);
            projects_array.push(proj);

            count++;

            if(count == keys.length) {
                callback({
                    sprints: sprints,
                    projs: projects_array
                });
            }
        });
        altcount++;
    });   
}

/**
 * Loads in graph and table content for each project
 * this is adapted from griggszm@msoe.edu's work
 * 
 * @author kouziosma@msoe.edu
 */
app.post("/loadProjects", function (req, res) {
    var sprintStarted = true;
    var startdate = "";
    var enddate = "";
    var sprint_array = JSON.parse(req.body.sprintArray);
    var sprint_selection = req.body.selectedTimebox;

    if(req.body.sprintTo != "" && req.body.sprintFrom != "") {
        var from = req.body.sprintFrom.split("/");
        var to = req.body.sprintTo.split("/");
        //YYYY-MM-DD
        startdate = from[2] + "-" + from[0] + "-" + from[1];
        enddate = to[2] + "-" + to[0] + "-" + to[1];
    }

    var projs = [];
    projs.push(req.body.projectArray);

    var keys = [];
    var names = [];

    var split = projs[0].split(',');
    keys.push(split[0]);
    names.push(split[1]);

    if (sprint_array !== undefined) {
        //YYYY-MM-DD
        var date_regex = new RegExp("^(\\d{4})-(\\d{2})-(\\d{2})");
        switch(sprint_selection) {
            case "Current Sprint":
                //Gets date string, and applies a 6 hour offset (default was GMT, we use CST so GMT-6)
                try {
                    //sprint_array.length-1 because the most recent sprint is the most recent array element
                    var start_date_and_time = new Date(sprint_array[sprint_array.length-1].sprint.startDate);
                    start_date_and_time.setHours(start_date_and_time.getHours()-6);
                    start_date_and_time = start_date_and_time.toISOString();

                    //sprint_array.length-1 because the most recent sprint is the most recent array element
                    var end_date_and_time = new Date(sprint_array[sprint_array.length-1].sprint.endDate);
                    end_date_and_time.setHours(end_date_and_time.getHours()-6);
                    end_date_and_time = end_date_and_time.toISOString();

                    startdate = date_regex.exec(start_date_and_time)[0];
                    enddate = date_regex.exec(end_date_and_time)[0];
                } catch(err) {
                    //Catches if the sprint isn't started, to prevent errors
                    sprintStarted = false;
                }
            break;
        }
    }

    if(sprintStarted) {
        t.getTasksAll(req, projs, startdate, enddate).then(function (results) {
            //If no worklog data
            if(results.task_array.length <= 0) {
                console.log("No worklogs for one or more selected projects");
                res.send(names[0]);
            }
            audit.report_errors(results['user_array'], results['task_array']);

            results = separate.separate(results, keys, names, keys.length);
            
            var dateHeader = [];
            var index = 0;
            for(var obj in results) {
                dateHeader[index] = results[obj].user_array[Object.keys(results[obj].user_array)[0]];
                index++;
            }

            var ok = true;
            for(var checkProject in results) {
                if(!results[checkProject].task_array || !results[checkProject].user_array) {
                    //user array is empty?
                    ok = false;
                }
            }

            var dateHeaderOK = true;
            for(var i = 0; i < dateHeader.length; i++) {
                if(!dateHeader[i]) {
                    dateHeaderOK = false;
                }
            }
            if(ok && results && dateHeaderOK) {
                var url = req.jwt.base_url;
                res.send({
                    title: 'About Time Log Viewer',
                    displayName: req.body.displayName,
                    sprintForm: req.body.usingSprintForm,
                    alljs: url + "/atlassian-connect/all.js",
                    dates: startdate + " - " + enddate,
                    projects: results,
                    totalDays: results.totalDays,
                    host: encodeURIComponent(url),
                    rawHost: url,
                    dateHeader: dateHeader,
                    projectArray: req.body.projectarray,
                    from: req.body.from,
                    to: req.body.to,
                });
            }
        });
    } else {
        res.send(names[0]);
    }
});

/**
 * Request that saves all of the changes made to projects array (add/remove)
 *
 * @author kouziosma@msoe.edu
 */
app.post("/saveprojects", function (req, res) {
    res.cookie('projsListTextbox', req.body.projectArray, {expires: moment().add(1, 'months').toDate()});
    res.redirect('back');
});

/**
 * Post request for viewing all instructor projects.
 *
 * @author griggszm@msoe.edu
 */
app.post("/viewInstructorProjects", function (req, res) {
    var projs = req.body.projectArray.split(";");
    projs.splice(-1);
    var start, end, formatted_start, formatted_end;
    var sprint = req.body.sprintList;
    var sprint_array = loadup.getSprintArray();
    if(req.body.projectList) {
        var current = req.body.projectList.split(',');
        res.cookie('pn' , {name: current[1], key: current[0], sprint: sprint}, {expires: moment().add(1, 'months').toDate()});
        if(req.cookies['pn']){
            req.cookies['pn'].name=current[1];
            req.cookies['pn'].key=current[0];
            req.cookies['pn'].sprint=sprint;
        }
    }

    var startdate;
    var enddate;
    
    if (sprint_array !== undefined) {
        for (var i = 0; i < sprint_array.length; i++) {
            if (sprint_array[i].sprint.name === sprint) {
                startdate = sprint_array[i].sprint.startDate;
                enddate = sprint_array[i].sprint.endDate;
            }
        }
    }
    
    if (req.body.usingSprintForm === "true") {
        if(enddate == undefined || startdate == undefined) {
            renderIndex(req, res, {error: "Cannot view time log for a non-started sprint."});
            return;
        }
        if(req.body.selectedFullSprint == 'false') {
            start = new Date(req.body.sprintTo);
            end = new Date(req.body.sprintFrom);
            start = formatDate(start);
            end = formatDate(end);
            req.body.to = end;
            req.body.from = start;
        } else {
            start = startdate.substring(0, 10);
            end = enddate.substring(0, 10);
            formatted_start = start.substring(5, 7) + "/" + start.substring(8, 10) + "/" + start.substring(0, 4);
            formatted_end = end.substring(5, 7) + "/" + end.substring(8, 10) + "/" + end.substring(0, 4);
            req.body.displayName = "Full sprint";
            req.body.to = end;
            req.body.from = start;
        }
    } else {
        formatted_start = req.body.from;
        formatted_end = req.body.to;
        if(formatted_start.includes("-")) {
            start = formatted_start;
            end = formatted_end;
        } else {
            start = formatted_start.substring(6, 10) + "-" + formatted_start.substring(0, 2) + "-" + formatted_start.substring(3, 5);
            end = formatted_end.substring(6,10) + "-" + formatted_end.substring(0,2) + "-" + formatted_end.substring(3,5);
        }
        if(req.body.displayName == undefined || req.body.displayName == "") {
            req.body.displayName = start + " to " + end;
        }


    }


    var keys = [];
    var names = [];

    for(var i = 0; i < projs.length; i++) {
        var split = projs[i].split(",");
        keys.push(split[0]);
        names.push(split[1]);
    }

    t.getTasksAll(req, projs, start, end).then(function (results) {
        audit.report_errors(results['user_array'], results['task_array']);
        results = separate.separate(results, keys, names, keys.length);
        res.cookie('from', req.body.from, {expires: moment().add(1, 'months').toDate()});
        res.cookie('to', req.body.to, {expires: moment().add(1, 'months').toDate()});
        res.cookie('projsListTextbox', req.body.projectArray, {expires: moment().add(1, 'months').toDate()});

        var toNextWeek = new Date(req.body.to);
        toNextWeek.setDate(toNextWeek.getDate() + 7);
        toNextWeek = ("0" + (toNextWeek.getMonth() + 1).toString()).substr(-2) + "/" + ("0" + toNextWeek.getDate().toString()).substr(-2)  + "/" + (toNextWeek.getFullYear().toString());

        var toLastWeek = new Date(req.body.to);
        toLastWeek.setDate(toLastWeek.getDate() - 7);
        toLastWeek = ("0" + (toLastWeek.getMonth() + 1).toString()).substr(-2) + "/" + ("0" + toLastWeek.getDate().toString()).substr(-2)  + "/" + (toLastWeek.getFullYear().toString());

        var fromNextWeek = new Date(req.body.from);
        fromNextWeek.setDate(fromNextWeek.getDate() + 7);
        fromNextWeek = ("0" + (fromNextWeek.getMonth() + 1).toString()).substr(-2) + "/" + ("0" + fromNextWeek.getDate().toString()).substr(-2)  + "/" + (fromNextWeek.getFullYear().toString());

        var fromLastWeek = new Date(req.body.from);
        fromLastWeek.setDate(fromLastWeek.getDate() - 7);
        fromLastWeek = ("0" + (fromLastWeek.getMonth() + 1).toString()).substr(-2) + "/" + ("0" + fromLastWeek.getDate().toString()).substr(-2)  + "/" + (fromLastWeek.getFullYear().toString());

        var dateHeader = undefined;
        for(var obj in results) {
            if(!dateHeader) {
                dateHeader = results[obj].user_array[Object.keys(results[obj].user_array)[0]];
            }
        }
        var ok = true;
        for(var checkProject in results) {
            if(!results[checkProject].task_array || !results[checkProject].user_array) {
                ok = false;
            }
        }
        if (results && dateHeader && ok) {
            return res.render('instructorView-custom', {
                title: 'About Time Log Viewer',
                displayName: req.body.displayName,
                sprintForm: req.body.usingSprintForm,
                alljs: req.jwt.base_url + "/atlassian-connect/all.js",
                dates: formatted_start + " - " + formatted_end,
                projects: results,
                totalDays: results.totalDays,
                host: encodeURIComponent(req.jwt.base_url),
                rawHost: req.jwt.base_url,
                dateHeader: dateHeader,
                projectArray: req.body.projectArray,
                toNextWeek: toNextWeek,
                fromNextWeek: fromNextWeek,
                toLastWeek: toLastWeek,
                fromLastWeek: fromLastWeek,
                from: req.body.from,
                to: req.body.to
            });
        } else {
            console.log(err.message);
            renderInstructorView(req, res, {error: "No time logged for the specified date range."});
            logger.error("%s - %s", req.jwt.base_url, err.message);
        }
    }).catch(function (err) {
        renderInstructorView(req, res, {error: "An error has occurred. Please try again later."});
        logger.error("%s - %s", req.jwt.base_url, err.message);
    });
});

app.get('/showInstructorView', function (req, res) {
    var recentNum = 0; // default number of
    if(req.query.projectName && req.query.sprintName) {
        var project = req.query.projectName.split(",");
        var sprint = req.query.sprintName;
        res.cookie('pn' , {name: project[1], sprint: sprint}, {expires: moment().add(1, 'months').toDate()});
        if(req.cookies['pn']){
            req.cookies['pn'].name=project[1];
            req.cookies['pn'].key=project[0];
            req.cookies['pn'].sprint=sprint;
        }
    }
    renderInstructorView(req, res, {recentNum: recentNum});
});

function renderInstructorView(req, res, kwargs) {
    loadup.loadPL(req, kwargs['recentNum'] || 0).then(function (results) {
        var dormantProjects = [];
        for (var index = results.project_array.length - 1; index >= 0; index--) {
            var current = results.project_array[index];
            if (current.name.toLowerCase().indexOf('dormant') !== -1 || (current.projectCategory !== undefined && current.projectCategory.name.toLowerCase().indexOf('dormant') !== -1)) {
                dormantProjects.unshift(current);
                results.project_array.splice(index, 1);
            }
        }
        dormantProjects.sort(function(a, b){ return a.name.localeCompare(b.name); });
        removeInvalidRecentProjects(req.recent, results.project_array);
        
        res.render('instructorView', {
            project: results,
            host: encodeURIComponent(req.jwt.base_url), //"https://msoese.atlassian.net"
            rawHost: req.jwt.base_url,
            alljs: req.jwt.base_url + "/atlassian-connect/all.js", //"https://msoese.atlassian.net"
            dormant: dormantProjects,
            pn: req.cookies.pn,
            from: req.cookies.from,
            to: req.cookies.to,
            projsListTextbox: req.cookies.projsListTextbox,
            error: kwargs['error'] || null
        });
    });
}

/**
 * This method removes any projects that may have been added to the recent cookie by other domains
 * from the recent section of the project dropdown
 * @param recent    The recent project list
 * @param projects  The projects list for the current domain
 * @author          sullivan-bormannaj
 */
function removeInvalidRecentProjects(recent, projects){
    if(recent){
        for(var i = recent.length - 1; i >= 0; i--){
            var currentProject = recent[i];
            var matched = false;
            for(var j = 0; j < projects.length; j++){
                var compareProject = projects[j];
                if(currentProject.key === compareProject.key && currentProject.name === compareProject.name){
                    matched = true;
                    break;
                }
            }
            if(!matched){
                recent.splice(i, 1);
            }
        }
    }
}
