require('dotenv').config();
var confluence = {};
var requestLib = require('request');
var jwt = require('../lib/jwt');
var querystring = require('querystring');
var _ = require('underscore');

//get all the pages information from confluence
confluence.getKeys = function (req, confluenceKey) {
    var canonical = '/rest/api/space';
    if(confluenceKey)
        canonical += '/' + confluenceKey + '/content';
    var token = jwt.encode("edu.msoe.abouttime", req.jwt.confluence_shared_secret, "GET", canonical, {
        limit: 200 //defualt is 25 from JIRA so we set it higher to make sure we don't miss any pages
    });
    var url = req.jwt.base_url + "/wiki" + canonical;
    url += "?jwt=" + token + '&' + querystring.stringify({
            limit: 200
        });
    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'privacyMode': true
        }
    };
    return new Promise(function (resolve, reject) {
        requestLib(options, function (error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};

confluence.getDescendantPages = function (req, parentID) {
    var resource = 'content/' + parentID + '/child/page';//get all the child page
    return getRequest(req, resource, null, '');
};

confluence.getPageContent = function (req, confluenceKey, pageTitle) {

    var canonical = '/rest/api/content';//get details for a specific page

    var token = jwt.encode("edu.msoe.abouttime", req.jwt.confluence_shared_secret, "GET", canonical, {
        spaceKey: confluenceKey,
        title: pageTitle,
        expand: "version,body.view" //the information we need
    });
    var url = req.jwt.base_url + "/wiki" + canonical;
    url += "?jwt=" + token + '&' + querystring.stringify({
        spaceKey: confluenceKey,
        title: pageTitle,
        expand: "version,body.view"
    });


    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'privacyMode': true
        }
    };
    return new Promise(function (resolve, reject) {
        requestLib(options, function (error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });

};
//general get request
function getRequest(req, resource, query, extra_url) {
    var canonical = '/rest/api/' + resource;
    var url = req.jwt.base_url + "/wiki" + canonical + extra_url;

    var token = jwt.encode("edu.msoe.abouttime", req.jwt.confluence_shared_secret, "GET", canonical, query);

    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'privacyMode': true
        }
    };
    return new Promise(function (resolve, reject) {
        requestLib(options, function (error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
}
confluence.findPageKey = function(req, confluenceKey, pageName) {
    return confluence.getKeys(req, confluenceKey).then(function (results) {
        try {
            var result = JSON.parse(results).page.results;
            var parent_key = _.findWhere(result, {title: pageName});
            if (parent_key){
                return parent_key.id;
            }else{
                return -2;
            }
        } catch (error) {
            console.log("there was an error in findPageKey");
            console.log(error);
        }
    })
};

confluence.getOrCreatePage = function(req, confluenceKey, pageName, parentID) {
    return confluence.findPageKey(req, confluenceKey, pageName).then(function (pageID) {
        var parentPromise = new Promise(function (resolve, reject) {
            return resolve();
        });
        // Create Status Reports folder if it doesn't exist
        if (pageID === -2)
            parentPromise = confluence.createPage(req, confluenceKey, pageName, null, parentID);
        return parentPromise.then(function () {
            return confluence.getPageContent(req, confluenceKey, pageName).then(function (contentResult) {
                return contentResult;
            });
        });
    });
};

//post request to create the page
confluence.createPage = function (req, confluenceKey, pageTitle, value, ParentID) {
    var data;
    if (ParentID === 0) {//if it is the main status reports page
        data = {
            "type": "page",
            "title": "Status Reports",
            "space": {
                "key": confluenceKey
            },
            "body": {
                "storage": {
                    "value": "",
                    "representation": "storage"
                }
            }
        };
    } else {//the child page (the status report generated)
        data = {
            "type": "page",
            "title": pageTitle,
            "ancestors": [{"id": ParentID}],
            "space": {
                "key": confluenceKey
            },
            "body": {
                "storage": {
                    "value": value,
                    "representation": "storage"
                }
            }
        }
    }
    return this.postRequest(req, data);
};

confluence.postRequest = function (req, data) {
    var canonical = '/rest/api/content';
    var url = req.jwt.base_url + "/wiki" + canonical;

    var token = jwt.encode("edu.msoe.abouttime", req.jwt.confluence_shared_secret, "POST", canonical, null);

    var options = {
        url: url,
        json: data,
        method: 'POST',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'privacyMode': true
        }
    };
    return new Promise(function (resolve, reject) {
        requestLib(options, function (error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};
//update the page
confluence.updatePage = function (req, result, pageTitle, value, deleteOld) {
    var oldcontent;
    if (deleteOld === false) {
        oldcontent = JSON.parse(result).results[0].body.view.value;
    } else {
        oldcontent = "";
    }
    var canonical = '/rest/api/content/' + JSON.parse(result).results[0].id;

    var url = req.jwt.base_url + "/wiki" + canonical;
    var data = {
        "version": {
            "number": JSON.parse(result).results[0].version.number + 1 //the version number needs to be incremented
        },
        "title": pageTitle,
        "type": "page",
        "body": {
            "storage": {
                "value": oldcontent + value, //update the page will update the whole page with the new html so we need to add the old html with the new additonal one
                "representation": "storage"
            }
        }
    };

    var token = jwt.encode("edu.msoe.abouttime", req.jwt.confluence_shared_secret, "PUT", canonical, data);

    var options = {
        url: url,
        json: data,
        method: 'PUT',
        headers: {
            'Authorization': 'JWT ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'privacyMode': true
        }
    };
    return new Promise(function (resolve, reject) {
        requestLib(options, function (error, response, body) {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
};

module.exports = confluence;