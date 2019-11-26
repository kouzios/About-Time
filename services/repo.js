var mysql = require('mysql');
var Promise = require('promise');
var _ = require("underscore");

var connections;
if(process.env.RDS_HOSTNAME){
    connections = mysql.createPool({
        host     : process.env.RDS_HOSTNAME,
        user     : process.env.RDS_USERNAME,
        password : process.env.RDS_PASSWORD,
        port     : process.env.RDS_PORT,
        database  : "time_logger"
    });
}else{
    connections = mysql.createPool({
        connectionLimit: 5,
        host      : process.env.DB_HOST,
        database  : process.env.DB_NAME,
        user      : process.env.DB_USER,
        password  : process.env.DB_PASS
    });
}


module.exports = {
  query: function(query, args) {
    if(!_.isArray(args)) { args = [args] }
    return new Promise(function(resolve, reject) {
      connections.getConnection(function(error,connection) {
        if(connection) {
          var q = connection.query(query, args, function(error, results, fields) {
            connection.release();
            if(error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        } else {
          reject(error);
        }
      })
    });
  },

  update: function(sql, args) { // NEEDS TO BE EDITED
      if(!_.isArray(args)) { args = [args] }
      return new Promise(function(resolve, reject) {
          connections.getConnection(function(error,connection) {
              if(connection) {
                  var q = connection.query(sql, args, function(error, results, fields) {
                      connection.release();
                      if(error) {
                          reject(error);
                      } else {
                          resolve(results);
                      }
                  });
              } else {
                  reject(error);
              }
          })
      });
  }
};

