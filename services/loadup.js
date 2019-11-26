require('dotenv').config();
var loadup = {};
var _ = require('underscore');
var request=require("./request.js");
var Promise = require("promise");
var requestLib = require('request');
var bitbucket = require('../bitbucket.json');

var project_array;
var sub_board_array;
var board_array;
var sub_namematcharray;
var namematcharray;
var promises2;
var sprint_array;

/**
 * all call the functions to get the required data. return the filled array with all the info
 * @param req
 * @param recentNum
 */
loadup.loadPL = function (req, recentNum) {

    return getprojectlist(req, recentNum).then(function () {
        project_array.sort(function(a, b){ return a.name.localeCompare(b.name); });
        return{
            project_array:project_array
        }
    });
};

/**
 * to get the sprint data for the specified project
 * @param req
 * @param projectname
 */
loadup.getSprintInfo = function(req,projectkey){
    return request.getboardidfromprojectkey(req, projectkey, 0).then(function (results) {
        boardid = JSON.parse(results).values[0].id; //TODO: MAKE SAFE CHECK HERE

        return request.getSprint(req,null,boardid).then(function (results) {
            sprint_array = _.map(JSON.parse(results).values, function(e) {
                return {
                    sprint: e
                }
            });

            return sprint_array;
        });
    });
};

/**
 * to get the sprint data for the specified project
 * @param req
 * @param projectkey
 */
loadup.getSpacePages = function(req,projectkey){
    return request.getboardidfromprojectkey(req, projectkey, 0).then(function (results) {
        var boardid = JSON.parse(results).values[0].id; //TODO: MAKE SAFE CHECK HERE

        return request.getSprint(req,null,boardid).then(function (results) {
            sprint_array = _.map(JSON.parse(results).values, function(e) {
                return {
                    sprint: e
                }
            });

            return sprint_array;
        });
    });
};


/**
 * return the sprint array
 * @returns {*}
 */
loadup.getSprintArray=function () {
    return sprint_array;
};

/**
 * Posts an issue to bitbucket
 * @param       req: the request from the client side
 * @returns     {*|Promise} A promise with the response from bitbucket
 * @author      aullivan-bormannaj
 */
loadup.postIssue = function(req) {
    if (process.env.ENV === "dev") {
        var base = 'https://'+process.env.BITBUCKET_USERNAME+':'+process.env.BITBUCKET_PASSWORD+'@api.bitbucket.org/1.0';
    }else{
        var base = 'https://'+bitbucket.username+':'+bitbucket.password+'@api.bitbucket.org/1.0';

    }
    var canonical = '/repositories/hasker/abouttime/issues';
    var url = base + canonical;

    var description = encodeURIComponent(req.body.description);
    var title = encodeURIComponent(req.body.title);
    var issueType = req.body.issueType;
    var priority = req.body.priority;
    var email = req.body.email === "" ? "Anonymous":encodeURIComponent(req.body.email);

    description += "\n\nReported by: "+ email;

    var body = "title="+title+"&content="+description+"&kind="+issueType+"&priority="+priority;

    var options = {
        url: url,
        method: 'POST',
        body: body,
        headers: {
        }
    };

    return new Promise(function(resolve, reject) {
        requestLib(options, function(error, response, body) {
            if (response.statusCode != 200) {
                return resolve("Error: "+response.statusMessage);
            }
            return resolve("Issue reported successfully!");
        });
    });
};

/**
 * Get all the projects
 * @param req
 * @param recentNum
 */
function getprojectlist(req, recentNum){
    return request.projectlist(req,null,recentNum).then(function (results) {
        project_array = _.map(JSON.parse(results), function(e) {
            return {
                id:e.id,
                key: e.key,
                name: e.name,
                projectCategory: e.projectCategory,
                boardid:null,
                sprint:null
            };
        });
    });
}


/**
 * get the board id for all the projects
 * @param req
 */
function getallprojectsinfo(req){
    var index=0;
    board_array=[];
    var promises=[];
    promises2=[];
    namematcharray=[];

    while(project_array.length>index) {
        promises.push( fillboardidarray(req,index));

        index+=50;
    }
    return Promise.all(promises).then(function () {
        _.each(board_array,function (e) {
            return promises2.push(fillPNnamefromboard(req,e.boardid))

        });
    });
}

/**
 * load the final project array
 * @param req
 */
function getfinalarray(req){
    return Promise.all(promises2).then(function () {

        for (var i = 0; i <namematcharray.length; i++) {
            _.each(project_array, function (e) {

                if (e.name === namematcharray[i].name) {
                    e.boardid=namematcharray[i].boardid;
                }
            })

        }
    })
}

function fillPNnamefromboard(req,boardid){
    return request.getPNfromboard(req,null,boardid).then(function (results) {
        var resultsJSON = JSON.parse(results);
        sub_namematcharray=_.map(resultsJSON.values,function (e) {
            return {
                boardid:boardid,
                name:e.name
            }
        });
        namematcharray=namematcharray.concat(sub_namematcharray);
    }).catch(function(error){

        console.log(error)});
}

function fillboardidarray(req,index){
    return request.getboardid(req,null,index).then(function (results) {
        var resultsJSON = JSON.parse(results);
        sub_board_array = _.map(resultsJSON.values, function (e) {
            return {
                boardid: e.id
            }
        });
        board_array=board_array.concat(sub_board_array);
    });
}

module.exports = loadup;