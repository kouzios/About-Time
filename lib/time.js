var time = {};
var _ = require("underscore");
var moment = require("moment");

time.DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formats a given date to the accepted JQL search format
 * @param {moment} date The momentjs date to be formatted
 * @return {string} The date in YYYY-MM-DD
 */
time.format = function(date) {
  return moment(date).format("YYYY-MM-DD");
};

/**
 * Returns the day of a month as a number.
 * @param {moment} date The momentjs date to be formatted
 * @return {string} The date in DD format.
 */
time.getDay = function(date) {
  if (_.isUndefined(date) || _.isNull(date)) {
    throw new Error("time.getDay: date must be defined.");
  }
  var day = moment(date).get('date');
  if (day < 10)
    day = '0' + day;
  return day;
}

/**
 * Formats a given date to DDD format. (e.g. Mon)
 * @param {moment} date The momentjs date to be formatted
 * @return {string} The day in DDD format.
 */
time.formatDay = function(date) {
  if (_.isUndefined(date) || _.isNull(date)) {
    throw new Error("time.formatDay: date must be defined.");
  }
  return moment(date).format('ddd'); 
}

/**
 * Formats a given date to MMM format. (e.g. Feb)
 * @param {moment} date The momentjs date to be formatted
 * @return {string} The month in MMM format.
 */
time.formatMonth = function(date) {
  if (_.isUndefined(date) || _.isNull(date)) {
    throw new Error("time.formatMonth: date must be defined.");
  }
  return moment(date).format('MMM');
}

/**
 * Returns the total amount of days in a given date range.
 * @param {moment} date The momentjs date used as point of reference
 * @param {moment} earlier_date The momentjs date to be subtracted
 * @return {int} The amount of days.
 */
time.getTotalDays = function(date, earlier_date) {
  if (_.isUndefined(date) || _.isNull(date)) {
    throw new Error("time.getTotalDays: date must be defined.");
  }
  if (_.isUndefined(earlier_date) || _.isNull(earlier_date)) {
    throw new Error("time.getTotalDays: earlier_date must be defined.");
  }
  var start = moment(new Date(earlier_date));
  var end = moment(new Date(date));
  return end.diff(start, 'days') + 1;
}

/**
 * Returns the start of the week provided the startdate
 * @param {moment} startdate An arbitrary date to start at.
 * @return {string} The start of the week for the given date in YYYY-MM-DD.
 **/
time.getStartOfWeek = function(startdate) {
  if (_.isUndefined(startdate) || _.isNull(startdate)) {
    throw new Error("time.getStartOfWeek: startdate must be defined.");
  }

  return time.format(moment(startdate).startOf('isoweek'));
}

/**
 * Gets the end of the week provided the given date
 * @param {moment} startdate The date in question
 * @return {string} The end of the week in YYYY-MM-DD.
 */
time.getEndOfWeek = function(startdate) {
  if (_.isUndefined(startdate) || _.isNull(startdate)) {
    throw new Error("time.getStartOfWeek: startdate must be defined.");
  }
  return time.format(moment(startdate).endOf('isoweek'));
};

/**
 * Gets the start of the month provided the given date
 * @param {moment} startdate The date in question
 * @return {string} The start of the month in YYYY-MM-DD.
 */
time.getStartOfMonth = function(startdate) {
  if (_.isUndefined(startdate) || _.isNull(startdate)) {
    throw new Error("time.getStartOfMonth: startdate must be defined.");
  }
  
 return time.format(moment(startdate).startOf('month'));
};

/**
 * Gets the end of the month provided the given date
 * @param {moment} startdate The date in question
 * @return {string} The end of the month in YYYY-MM-DD
 */
time.getEndOfMonth = function(startdate) {
  if (_.isUndefined(startdate) || _.isNull(startdate)) {
    throw new Error("time.getEndOfMonth: startdate must be defined.");
  }
  
  return time.format(moment(startdate).endOf('month')); 
};

/**
 * Returns a date formatted as `yyyy/mm/dd hh:mm`. The week is defined to start on a Monday and end on a Sunday.
 *
 * @param {moment} startdate An arbirtaty date to start at.
 * @return {string} The start and end of the week.
 *  {
 *    start: `YYYY-MM-DD`,
 *    end: `YYYY-MM-DD`
 *  }
 */
time.getWeek = function(startdate) {
  // use today if no startdate provided
  if (_.isUndefined(startdate) || _.isNull(startdate)) {
    throw new Error("time.getWeek: startdate must be defined");   
  }

  return time.getWeeks(startdate, 1);
}

/**
 * Gets the date range for n weeks time.
 * @param {moment} startdate An arbirtaty date to start at.
 * @return {string} The date range for the parameters in YYYY-MM-DD.
 *  {
 *    start: `YYYY-MM-DD`,
 *    end: `YYYY-MM-DD`
 *  }
 */
time.getWeeks = function(startdate, n) {
  if (_.isUndefined(startdate) || _.isNull(startdate)) {
    throw new Error("time.getWeeks: startdate must be defined.");
  }

  if (_.isUndefined(n) || _.isNull(n)) {
    throw new Error("time.getWeeks: n must be defined.");
  }

  if (!_.isNumber(n) || _.isNaN(n) || !_.isFinite(n)) {
    throw new Error("time.getWeeks: n must be a real, finite number.");
  }

  var finalweek = moment(startdate).add(n-1, "weeks");

  return {
    start: time.getStartOfWeek(startdate),
    end: time.getEndOfWeek(finalweek)
  };
}

/**
 * Gets the month date range for the provided date.
 * @param {moment} startdate The date that should be used to fetch the current month.
 * @return {string} The date range for the parameter.
 *  {
 *    start: `YYYY-MM-DD`,
 *    end: `YYYY-MM-DD`
 *  }
 */
time.getMonth = function(startdate) {
  if (_.isUndefined(startdate) || _.isNull(startdate)) {
    throw new Error("time.getMonth: startdate must be defined."); 
  }
  
  return {
    start: time.getStartOfMonth(startdate),
    end: time.getEndOfMonth(startdate)
  };
}

/**
 * Checks if a date is between a given date range (inclusive).
 * @param {moment} startdate The date beginning the date range.
 * @param {moment} enddate The date ending the date range.
 * @param {moment} date The date being checked.
 * @return {boolean} Boolean flag if date is in the date range.
*/
time.isBetween = function(startdate, enddate, date) {
  if (_.isUndefined(startdate) || _.isNull(startdate)) {
    throw new Error("time.isBetween: start date must be defined."); 
  }
  if (_.isUndefined(enddate) || _.isNull(enddate)) {
    throw new Error("time.isBetween: end date must be defined."); 
  }
  return moment(date).isBetween(startdate, enddate, 'days', []);
};

module.exports = time;

