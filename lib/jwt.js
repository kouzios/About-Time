var jwt = require('jsonwebtoken');
var base64url = require('base64url');
var _ = require('underscore');
var crypto = require('crypto');
var jwt_auth = {};

/**
 * Verifies a token from atlassian given their generated token and the shared secret.
 * @param {string} token the token provided by atlassian.
 * @param {string} secret This is the shared secret that is pulled out by the middleware and placed in the req.jwt object. If the secret does not exist, it is because you need to figure out a way to render the host object in a form or url query parameter.
 *
 */ 
jwt_auth.verify = function(token, secret) {
  if(!_.isString(token)) {
    throw new Error("jwt.verify: token must be a string.");
  }

  if(!_.isString(secret)) {
    throw new Error("jwt.verify: secret must be a string.");
  }

  var success;
  try {
    jwt.verify(token, secret);
    success = true;
  } catch(err) {
    success = false;
  }
  return success;
}

/**
 * This will create a JWT token that is complient with Atlassian's shit.
 * @param {string} key This can be found in your atlassian-connect.json file. 
 * @param {string} secret This is the shared secret that is pulled out by the middleware and placed in the req.jwt object. If the secret does not exist, it is because you need to figure out a way to render the host object in a form or url query parameter.
 * @param {string} type This will either be GET, POST, PUT, or DELETE
 * @param {string} canonical This is the cannonical url. This is the entire URL MINUS the base_url in the req.jwt.base_url.
 * @param {object} params This is the parameters for a certain request. ONLY USE THIS FOR A GET REQUEST. This is because POST requests are inherintly safe due to how the request is made over https. GET requests are unsafe because the url is not encrypted.
 *
 */
jwt_auth.encode = function(key, secret, type, canonical, params) {
  if (!_.isString(key)) {
    throw new Error("jwt.encode: key must be a string");
  }

  if (!_.isString(secret)) {
    throw new Error("jwt.encode: secret must be a string");
  }

  if (!_.isString(type)) {
    throw new Error("jwt.encode: type must be a string");
  }

  if (!_.isString(canonical)) {
    throw new Error("jwt.encode: canonical must be a string. Found ", canonical);
  }

  if (!_.isNull(params) && !_.isUndefined(params) && !_.isObject(params)) {
    throw new Error("jwt.encode: params must be undefined or an object");
  }

  requestArray = [type, canonical];
  if (type === "GET" || type === "get") {
    requestArray.push(jwt_auth.constructQueryString(params));
  } else {
    requestArray.push("");  
  }

  var requestString = requestArray.join('&');

  var claims = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000)+86400, //expires in 1 day
    iss: key,
    qsh: crypto.createHash('sha256').update(requestString).digest('hex')
  };

  return jwt.sign(claims, secret);
}

jwt_auth.constructQueryString = function(params) {
  if (_.isEmpty(params)) {
    return "";
  }

  return _.chain(params).map(function(v, k) {
    return [k, v]; 
  }).reduce(function(acc, e) {
    if (e[0] == "jwt") {
      return acc;   
    }
    acc.push({key: e[0], value: e[1]});
    return acc;  
  }, []).sortBy('key').reduce(function(acc, e) {
    var val;
    if (_.isArray(e.value)) {
      var formattedArray = _.map(e.value, function(f) {
        return encodeURIComponent(f);
      });
      val = formattedArray.join(',');
    } else {
      val = encodeURIComponent(e.value);
    }

    acc.push(encodeURIComponent(e.key) + '=' + val);
    return acc;
  }, []).value().join('&');
}

module.exports = jwt_auth;

