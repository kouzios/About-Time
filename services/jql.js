var jql = {};
var _ = require('underscore');
var http = require('http');
var request = require('./request');


/**
 * Submits a JQL seearch on a project regarding a query.
 * @param {string} query The JQL query to be submitted
 * @param {Object} options Parameters that will help filter out results further.
 * @return {Promise} A promise containing the search results.
 */
jql.search = function(req, query, options) {
  if (_.isUndefined(query) || _.isNull(query)) {
    throw new Error("jql.search: query must be defined.");
  }

  if (!_.isString(query)) {
    throw new Error("jql.search: query must be a string.");
  }

  /* Some fields that can be specified are:
   * startAt: <<number>>,
   * maxResults: <<number>>
   * fields: <<array[String]>>
   */
  //console.log("{query}: ", query);
  var postdata = {"jql": query, "maxResults":2000, "startAt":0};

  if (options && _.isObject(options)) {
    postdata = _.extend(postdata, options);
  }

  return request.postRequest(req, 'search', postdata, null)
};

module.exports = jql;

