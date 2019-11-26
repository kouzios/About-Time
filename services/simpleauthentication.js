var authentication = {};
var _ = require('underscore');

authentication.fetchToken = function() {
  if (_.isUndefined(process.env.JIRA_USERNAME) || _.isNull(process.env.JIRA_USERNAME)) {
    throw new Error("Authentication.fetchToken: Add 'JIRA_USERNAME' to your .env file");
  }
  if (_.isUndefined(process.env.JIRA_PASSWORD) || _.isNull(process.env.JIRA_PASSWORD)) {
    throw new Error("Authentication.fetchToken: Add 'JIRA_PASSWORD' to your .env file");
  }

  return new Buffer(process.env.JIRA_USERNAME+":"+process.env.JIRA_PASSWORD).toString('base64')
};

module.exports = authentication;

