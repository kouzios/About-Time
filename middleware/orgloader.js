var orgloader = {};
var _ = require('underscore');
var url = require('url');
var Organization = require('../models/organization');
var logger = require('../lib/logging');
var moment = require('moment');

/**
 * In order to do do anything in atlassian world, we need to know what host we are
 * dealing with. Some example of "hosts" are:
 * - msoese.atlassian.net
 * - johnsoncontrols.atlassian.net (if this even exists)
 * - northwesternmutual.atlassian.net (ditto)
 *
 * A host is basically any customer of our plugin. With this in mind, we need to
 * figure out what host the current user is connected to. To do this, the host will
 * come from any of the following
 *  - req.query.host: on GET requests
 *  - req.query.host: on POST requests
 *  - req.query.xdm_e: when Atlassian is sending the user our way
 *
 * If we cannot find the host in this middleware, its because you either need to
 * have the user submit the host in a form of some sort, or because of another bug
 * in your code.
 *
 * The only acceptable time when we can operate without a host is when the plugin
 * is installed for the first time on a new host.
 */
orgloader.run = function(req, res, next) {
    req.jwt = {};
     // if (process.env.ENV === "dev") {
     //     host = process.env.JIRA_URL;
     //  } else
    if (req.query.xdm_e) {
        var host = req.query.xdm_e; //provided by jira
    } else if (req.cookies.host) {
        var host = req.cookies.host;
    } else if (req.query.host) {
        var host = decodeURIComponent(req.query.host); //provided on get requests
    } else if (req.body.host) {
        var host = decodeURIComponent(req.body.host); //provided on form submission
    } else {
        return next();
    }
    res.cookie('host', host, {expires: moment().add(1, 'months').toDate()});
    //console.log("host", host);

    var org = new Organization();
    org.fetchByHost(host).then(function(dbResults) {
        if (_.isEmpty(dbResults)) {
            return next();
        }
        var dbObj = _.first(dbResults);
        req.jwt.client_key = dbObj.client_key;
        req.jwt.public_key = dbObj.public_key;
        req.jwt.jira_shared_secret = dbObj.jira_shared_secret;
        req.jwt.confluence_shared_secret = dbObj.confluence_shared_secret;
        req.jwt.base_url = dbObj.base_url;
        next();
    }).catch(function(err) {
        console.log("{err}: ", err);
        logger.error(host + " - " + err);
        throw new Error("orgloader.run: Unable to get jwt information for " + host);
        next();
    });
};

module.exports = orgloader;

