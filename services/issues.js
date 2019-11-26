var issues = {};
var time = require('../lib/time');
var jql = require('./jql');
var _ = require('underscore');
var logger = require('../lib/logging');

/**
 * Team member total time logged for given date.
 * @param {Object} req The request object
 * @param {string} project Project being queried.
 * @param {moment} startdate An arbitrary date to start at.
 * @param {moment} enddate An arbitrary date to end at.
 * @return {promise} Issues from Jira.
 **/
issues.query = function(req, project, startdate, enddate) {
    if (_.isUndefined(project)) {
        throw new Error("issues.query: project must be defined.");
    }

    if (_.isUndefined(startdate)) {
        throw new Error("issues.query: startdate must be defined.");
    }

    if (_.isUndefined(enddate)) {
        throw new Error("issues.query: enddate must be defined.");
    }

    if (!_.isString(project)) {
        throw new Error("issues.query: project must be a string.");
    }

    if (!_.isString(startdate) || !time.DATE_REGEX.test(startdate)) {
        throw new Error("issues.query: startdate must be in the form YYYY-MM-DD.");
    }

    if (!_.isString(enddate) || !time.DATE_REGEX.test(enddate)) {
        throw new Error("issues.query: enddate must be in the form YYYY-MM-DD.");
    }
    return jql.search(req, 'PROJECT = "' + project + '" AND worklogDate >= ' + startdate + ' AND worklogDate <= ' + enddate, {fields: ["issuetype", "parent", "timespent", "summary", "worklog", "status", "created"], validateQuery: "none"});
};

/**
 * Team member total time logged for given date.
 * @param {Object} req The request object
 * @param {string} project Project being queried.
 * @param {moment} startdate An arbitrary date to start at.
 * @param {moment} enddate An arbitrary date to end at.
 * @return {promise} Issues from Jira.
 *
 * @author griggszm@msoe.edu
 *
 **/
issues.queryMultiple = function(req, project, startdate, enddate) {
    if (_.isUndefined(project)) {
        throw new Error("issues.query: project must be defined.");
    }

    if (_.isUndefined(startdate)) {
        throw new Error("issues.query: startdate must be defined.");
    }

    if (_.isUndefined(enddate)) {
        throw new Error("issues.query: enddate must be defined.");
    }

    if (!_.isString(project)) {
        throw new Error("issues.query: project must be a string.");
    }

    if (!_.isString(startdate) || !time.DATE_REGEX.test(startdate)) {
        throw new Error("issues.query: startdate must be in the form YYYY-MM-DD.");
    }

    if (!_.isString(enddate) || !time.DATE_REGEX.test(enddate)) {
        throw new Error("issues.query: enddate must be in the form YYYY-MM-DD.");
    }
    var query = project+ ' AND worklogDate >= ' + startdate + ' AND worklogDate <= ' + enddate
    return jql.search(req, query , {fields: ["issuetype", "parent", "timespent", "summary", "worklog", "status", "created"], validateQuery: "none"});
};

issues.queryAll=function(req, issue, startdate, enddate){
    return jql.search(req, 'issue = ' + issue ,{fields: ["worklog"]});
};

issues.getAllIssues= function(project, startdate, enddate) {
    issues.queryAll(project, startdate, enddate).then(function(results) {
        //console.log(JSON.stringify(results))
    }).catch(function(err) {
        console.log(err.stack);
        logger.error(err.stack);
    });
    return issues.queryAll(project, startdate, enddate);
};

/**
 * Gets the completed issues in the date range.
 * @param {String} project The project name that is subject to JQL query.
 * @param {String} startdate The lower bound of the `updatedDate` in JQL.
 * @param {String} enddate The upper bound of the `updatedDate` in JQL.
 * @return {Array} Returns a list of issues that conform to the given parameters.
 */
issues.getCompleted = function(project, startdate, enddate) {
    return issues.query(project, "Done", startdate, enddate);
};

issues.getInProgress = function(project, startdate, enddate) {
    return issues.query(project, "In Progress", startdate, enddate);
};

issues.getInReview = function(project, startdate, enddate) {
    return issues.query(project, "In Review", startdate, enddate);
};

issues.getReady = function(project, startdate, enddate) {
    return issues.query(project, "Ready", startdate, enddate);
};

issues.getBlocked = function(project, startdate, enddate) {
    return issues.query(project, "Blocked", startdate, enddate);
};
issues.getToDO= function(project, startdate, enddate) {
    return issues.query(project, "To Do", startdate, enddate);
};

module.exports = issues;
