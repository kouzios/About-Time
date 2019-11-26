var fs = require('fs');
var Logger = require('log');
var log = new Logger('debug', fs.createWriteStream('abouttime.log'));

module.exports = log;