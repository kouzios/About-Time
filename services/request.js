var request = {};
var requestLib = require('request');
var http = require('http');
var _ = require('underscore');
var jwt = require('../lib/jwt');
var querystring = require('querystring');
var Promise = require('promise');
var moment = require('moment');
requestLib.debug = true;

/**
 * Submits a GET request
 * @param (req) the request object
 * @param {string} resource The name of the resource that is going to be fetched.
 * @param {string} id The id of the resource that is going to be fetched.
 * @param (query) the query to be requested
 * @return {Promise} Returns the results of the request.
 */
request.getRequest = function(req, resource, id, query) {
    if (_.isUndefined(resource)) {
        throw new Error("request.getRequest: resource must be defined.");
    }
    if (!_.isUndefined(query) && !_.isNull(query) && !_.isObject(query)) {
        throw new Error("request.getRequest: query must be defined.");
    }
    var canonical = '/rest/api/latest/' + resource;
    if (id) {
        canonical += '/' + id;
    }
    var now = moment().utc();

    var token = jwt.encode("edu.msoe.abouttime", req.jwt.jira_shared_secret, "GET", canonical, query);
    var url = req.jwt.base_url + canonical;
    url += "?jwt=" + token;
    if (query) {
        url = url + '&' + querystring.stringify(query);
    }
    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            "Accept": "application/json",
            "x-atlassian-force-account-id": true
        }
    };
    return new Promise(function(resolve, reject) {
        requestLib(options, function(error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};


/**
 * Submits a POST request
 * @param (req) the request object
 * @param {string} resource The name of the resource that is going to be fetched.
 * @param {Object} postdata The data that will be sent in the POST request
 * @param {string} id The id of the resource that is going to be fetched/modified
 * @return {Promise} Returns the results of the request
 */
request.postRequest = function(req, resource, postdata, id) {
    if (!_.isString(resource)) {
        throw new Error("request.postRequest: resource must be a string. Found ", resource);
    }
    if (_.isUndefined(postdata) || _.isNull(postdata)) {
        throw new Error("request.getPostOptions: postdata must be defined.");
    }
    var canonical = '/rest/api/latest/' + resource;
    if (id) {
        canonical += '/' + id;
    }

    var url =req.jwt.base_url + canonical;
    var token = jwt.encode("edu.msoe.abouttime",req.jwt.jira_shared_secret, "POST", canonical, postdata);
    var options = {
        url: url,
        method: 'POST',
        json: postdata,
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            "x-atlassian-force-account-id": true
        }
    };
    return new Promise(function(resolve, reject) {
        requestLib(options, function(error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};


/**
 * get the worklog for specific issue
 * @param req
 * @param issue
 * @param resource
 * @param id
 * @returns {*}
 */
request.postnoJQLrequest= function(req, issue,resource, id) {
    var canonical = '/rest/api/latest/issue/'+issue+"/worklog";

    if (id) {
        canonical += '/' + id;
    }

    var url = req.jwt.base_url + canonical;



    var token = jwt.encode("edu.msoe.abouttime", req.jwt.jira_shared_secret, "GET", canonical, null);

    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            "x-atlassian-force-account-id": true
        }
    };
    return new Promise(function(resolve, reject) {
        requestLib(options, function(error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};
/**
 * get all the projects we have
 * @param req
 * @param id
 * @param recentNum
 * @returns {*}
 */
request.projectlist= function(req, id, recentNum) {
    var canonical = '/rest/api/latest/project';

    if (id) {
        canonical += '/' + id;
    }

    // recentNum = 0;

    var token;

    var url = req.jwt.base_url + canonical;

    if(recentNum && recentNum > 0){

        token = jwt.encode("edu.msoe.abouttime", req.jwt.jira_shared_secret, "GET", canonical, {recent:5});
        url += "?jwt=" + token + '&' + querystring.stringify({recent:5});
    }else{
        token = jwt.encode("edu.msoe.abouttime", req.jwt.jira_shared_secret, "GET", canonical);
    }

    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            "x-atlassian-force-account-id": true
        }
    };
    return new Promise(function(resolve, reject) {
        requestLib(options, function(error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};
/**
 * get all the board ids
 * @param req
 * @param id
 * @param index
 * @returns {*}
 */
request.getboardid=function(req,id,index){
    var canonical = '/rest/agile/1.0/board';

    if (id) {
        canonical += '/' + id;
    }


    var token = jwt.encode("edu.msoe.abouttime", req.jwt.jira_shared_secret, "GET", canonical, {startAt:index});
    var url = req.jwt.base_url + canonical;
    url += "?jwt=" + token;

    url = url + '&' + querystring.stringify({startAt:index});


    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            "x-atlassian-force-account-id": true
        }
    };
    return new Promise(function(resolve, reject) {
        requestLib(options, function(error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};
/**
 * get all the boards in the project
 * @param req
 * @param projectkey
 * @param index
 * @returns {*}
 */
request.getboardidfromprojectkey=function(req,projectkey,index){
    var canonical = '/rest/agile/1.0/board';

    var token = jwt.encode("edu.msoe.abouttime", req.jwt.jira_shared_secret, "GET", canonical, {startAt:index, projectKeyOrId:projectkey});
    var url = req.jwt.base_url + canonical;
    url += "?jwt=" + token;

    url = url + '&' + querystring.stringify({startAt:index}) + '&' + querystring.stringify({projectKeyOrId:projectkey});

    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            "x-atlassian-force-account-id": true
        }
    };
    return new Promise(function(resolve, reject) {
        requestLib(options, function(error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};
/**
 * get the project number from board
 * @param req
 * @param id
 * @param boardid
 * @returns {*}
 */
request.getPNfromboard=function (req,id,boardid) {
    var canonical = '/rest/agile/1.0/board/'+boardid+"/project";
    if (id) {
        canonical += '/' + id;
    }

    var url = req.jwt.base_url + canonical;
    var token = jwt.encode("edu.msoe.abouttime", req.jwt.jira_shared_secret, "GET", canonical, null);
    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            "x-atlassian-force-account-id": true
        }
    };
    return new Promise(function(resolve, reject) {
        requestLib(options, function(error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};
/**
 * get the sprint information
 * @param req
 * @param id
 * @param boardid
 * @returns {*}
 */
request.getSprint=function (req,id,boardid) {
    var canonical = '/rest/agile/1.0/board/'+boardid+"/sprint";

    if (id) {
        canonical += '/' + id;
    }

    var url = req.jwt.base_url + canonical;


    var token = jwt.encode("edu.msoe.abouttime", req.jwt.jira_shared_secret, "GET", canonical, null);

    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            "x-atlassian-force-account-id": true
        }
    };
    return new Promise(function(resolve, reject) {
        requestLib(options, function(error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};
/**
 * get all the issueTypes (haven't used yet cause it is too complicated. Values for issueTypes are hard-coded right now)
 * @param req
 * @param key
 * @returns {*}
 */
request.getIssueTypes=function (req,key) {
    var canonical = '/rest/api/2/project/'+key;

    if (id) {
        canonical += '/' + id;
    }

    var url = req.jwt.base_url + canonical;


    var token = jwt.encode("edu.msoe.abouttime", req.jwt.jira_shared_secret, "GET", canonical, null);

    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            "x-atlassian-force-account-id": true
        }
    };
    return new Promise(function(resolve, reject) {
        requestLib(options, function(error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};

/**
 * retrievs the current time from the base url server
 * used so that the times can be converted from jira time to the time the server is using
 * @returns {*|Promise}
 * @author jacksonbrant@msoe.edu
 */
request.getServerInfo = function(req){
    var canonical = '/rest/api/2/serverInfo';
    //Url used to get the jira server time
    var url = req.jwt.base_url + canonical;
    var token = jwt.encode("edu.msoe.abouttime", req.jwt.jira_shared_secret, "GET", canonical, null);

    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            "x-atlassian-force-account-id": true
        }
    };
    return new Promise(function(resolve, reject) {
        requestLib(options, function(error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};

module.exports = request;