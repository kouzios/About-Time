require('dotenv').config();
var expect = require('chai').expect;
var request = require('../../services/request');
var sinon = require('sinon');
var req = require('request');


describe('Request', function() {
  describe('getRequest', function() {
    it('throws error when query is undefined', function() {
      var throwFunction = function() {
        request.getRequest({}, null, '1', '1'); 
      }     
      expect(throwFunction).to.throw(/getRequest: query must be defined./);
    }); 

    it('throws error when resource is undefined', function() {
      var throwFunction = function() {
        request.getRequest({}, undefined, '1', '1'); 
      }     
      expect(throwFunction).to.throw(/getRequest: resource must be defined./);
    });
  });

  describe('postRequest', function() {
    it('throws error when resource is null', function() {
      var throwFunction = function() {
        request.postRequest({}, null, {}); 
      }     
      expect(throwFunction).to.throw(/resource/);
    }); 

    it('throws error when postdata is null', function() {
      var throwFunction = function() {
        request.postRequest({}, 'search', null); 
      }     
      expect(throwFunction).to.throw(/postdata/);
    });
  });
});

