require('dotenv').config();
var expect = require('chai').expect;
var sinon = require('sinon');
var issues = require('../../services/issues');
var request = require('../../services/request');

describe('Issues', function() {
  describe('query', function() {
    it('should pass a happy path', function() {
      sinon.stub(request, "postRequest");
      issues.query({jwt: {jira_shared_secret: "shhh"}}, "Test", "2016-12-01", "2017-01-01");
      expect(request.postRequest.calledOnce).to.equal(true);
      request.postRequest.restore(); 
    });

    it('throws error with undefined project', function() {
      var throwFunction = function() {
        issues.query({}, undefined, "2016-12-01", "2017-01-01");
      };
      expect(throwFunction).to.throw(/issues.query: project must be/);
    });

    it('throws error with null project', function() {
      var throwFunction = function() {
        issues.query({}, null, "2016-12-01", "2017-01-01");
      };
      expect(throwFunction).to.throw(/issues.query: project must be/);
    });

    it('throws error when startdate is undefined', function() {
      var throwFunction = function() {
        issues.query({}, "Test", undefined, "2017-01-01");
      };
      expect(throwFunction).to.throw(/issues.query: startdate must be defined./);
    });

    it('throws error when startdate is in MM-DD-YYYY', function() {
      var throwFunction = function() {
        issues.query({}, "Test", "12-01-2016", "2017-01-01");
      };
      expect(throwFunction).to.throw(/issues.query: startdate must be in the form YYYY-MM-DD./);
    });

    it('throws error when enddate is undefined', function() {
      var throwFunction = function() {
        issues.query({}, "Test", "2017-01-01", undefined);
      };
      expect(throwFunction).to.throw(/issues.query: enddate must be defined./);
    });

    it('throws error when enddate is in MM-DD-YYYY', function() {
      var throwFunction = function() {
        issues.query({}, "Test", "2016-12-01", "01-01-2017");
      };
      expect(throwFunction).to.throw(/issues.query: enddate must be in the form YYYY-MM-DD./);
      
    });
  });
});

