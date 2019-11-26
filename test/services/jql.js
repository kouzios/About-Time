require('dotenv').config();
var expect = require('chai').expect;
var jql = require('../../services/jql');
var request = require('../../services/request');
var sinon = require('sinon');

describe('JQL', function() {
  describe('search', function() {
    it('posts a search request when arguments are valid', function() {
      sinon.stub(request, "postRequest"); 
      jql.search({jwt: {jira_shared_secret: "shhh"}}, "JQL Query String");
      expect(request.postRequest.calledOnce).to.equal(true);
      request.postRequest.restore();
    });

    it('throws error when query not provided', function() {
      var throwsFunction = function() {
        jql.search({}, null);
      } 
      expect(throwsFunction).to.throw(/jql.search: query must be defined./);
    });

    it('throws error when query not string', function() {
      var throwsFunction = function() {
        jql.search({}, {});
      } 
      expect(throwsFunction).to.throw(/jql.search: query must be a string./);
    });
  });
});

