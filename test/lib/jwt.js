var expect = require('chai').expect;
var jwt = require('../../lib/jwt');

describe('JWT', function() {
  describe('verify', function() {
    it('throws error when token = null', function() {
      var throwsFunction = function() {
        jwt.verify(null, "abcd");
      }
      expect(throwsFunction).to.throw(/token/);
    });

    it('throws error when secret = null', function() {
      var throwsFunction = function() {
        jwt.verify("abcd", null);
      }
      expect(throwsFunction).to.throw(/secret/);
    });

    it('verify where token doesnt match secret', function() {
      // Encrypted JWT token which was made from random information (not secret)
      var token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE0ODQ4NDc1NTEsImV4cCI6MTUxNjM4MzU1MSwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.y4HebghMOpNAh9tSFe4MFSgDGj2fhoHaliqhkHH67i4";
      var secret = "qwerty";

      expect(jwt.verify(token, secret)).to.equal(false);
    });
  });

  describe('encode', function() {
    var key = "edu.msoe.timelogger",
      secret = "sshhh",
      type = "POST",
      canonical = "/rest/api/latest/issues",
      params = {
        project: "TEST",
        startedAt: "2016-01-01"
      };

    it('throws error when key = null', function() {
      var throwsFunction = function() {
        jwt.encode(null, secret, type, canonical, params);
      }

      expect(throwsFunction).to.throw(/jwt.encode: key/g);
    }); 

    it('throws error when secret = null', function() {
      var throwsFunction = function() {
        jwt.encode("", null, type, canonical, params);
      }

      expect(throwsFunction).to.throw(/jwt.encode: secret/g);
      
    });

    it('throws error when type = null', function() {
      var throwsFunction = function() {
        jwt.encode("", secret, null, canonical, params);
      }

      expect(throwsFunction).to.throw(/jwt.encode: type/g);
    });

    it('throws error when canonical = null', function() {
      var throwsFunction = function() {
        jwt.encode("", secret, type, null, params);
      }

      expect(throwsFunction).to.throw(/jwt.encode: canonical/g);
    });

    it('throws error when params is not an object', function() {
      var throwsFunction = function() {
        jwt.encode("", secret, type, canonical, "");
      }

      expect(throwsFunction).to.throw(/jwt.encode: params/g);
    });

    it('passes when params is null', function() {
      var res = jwt.encode("", secret, type, canonical, null).split('.');
      expect(res[0]).to.equal("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    });

    it('passes when nothing is null', function() {
      var res = jwt.encode("", secret, type, canonical, params).split('.');
      expect(res[0]).to.equal("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    });

  });

  describe('constructQueryString', function() {
    it('returns nothing with empty params', function() {
      var res = jwt.constructQueryString(null);

      expect(res).to.equal("");
    });
  }); 
});

