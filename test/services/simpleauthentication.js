var expect = require('chai').expect;
var authentication = require('../../services/simpleauthentication');


describe('Authentication', function() {
  describe('fetchToken', function() {
    it('converts a username and password to base64', function() {
      process.env.JIRA_USERNAME = "testuser";
      process.env.JIRA_PASSWORD = "test01";
      
      expect(authentication.fetchToken()).to.equal("dGVzdHVzZXI6dGVzdDAx");
    });
  });
});

