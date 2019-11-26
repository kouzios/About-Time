/**
 * @author griggszm@msoe.edu
 */

require('dotenv').config();
var expect = require('chai').expect;
var filter = require('../../services/filtertime.js')

describe('FilterTime', function() {
    describe('filter', function() {
        it('should correctly detect a time in range', function() {
            var start = new Date("2018-01-10T01:01:01");
            var end = new Date("2018-01-10T01:01:01");
            var time = new Date("2018-01-10T01:01:01");
            expect(filter.isTimeInDateRange(time,start,end)).to.equal(true);
        });

        it('should ignore seconds when checking range of dates', function() {
            var start = new Date("2018-01-10T01:01:07");
            var end = new Date("2018-01-10T01:01:09");
            var time = new Date("2018-01-10T01:01:01");
            expect(filter.isTimeInDateRange(time,start,end)).to.equal(true);
        });
    });
});