require('dotenv').config();
var expect = require('chai').expect;
var dateConverter = require("../public/dateConverter.js");

//Unchanged parameters for creating dates
var year = 2017;
var month = 0;
var day = 0;
var hours = 0;
var minutes = 0;
var seconds = 0;
var milliseconds = 0;

describe('FilterTime', function() {
    describe('filter', function() {

        /**
         * Tests to see if the conversion correctly handles the hours that don't directly convert
         */
        it('should correctly format midnight/noon', function() {
            var midnight = new Date(year, month, day, 0, minutes, seconds, milliseconds);
            var noon = new Date(year, month, day, 12, minutes, seconds, milliseconds);
            expect(dateConverter.to12HourString(midnight)).to.equal("12:00 AM");
            expect(dateConverter.to12HourString(noon)).to.equal("12:00 PM");
        });

        /**
         * Tests to see if the conversion correctly pads the minutes.
         */
        it('should correctly format date with minutes padding', function() {
            var date;
            for(var i = 0; i < 10; i++){
                date = new Date(year, month, day, hours, i, seconds, milliseconds);
                expect(dateConverter.to12HourString(date)).to.equal("12:0"+i+" AM");
            }
        });

        /**
         * Tests that morning hours set the time to AM
         */
        it('morning hours are set to AM', function() {
            var date;
            for(var i = 1; i < 12; i++){
                date = new Date(year, month, day, i, minutes, seconds, milliseconds);
                expect(dateConverter.to12HourString(date)).to.equal(i+":00 AM");
            }
        });

        it('afternoon hours are set to AM', function() {
            var date;
            for(var i = 13; i < 24; i++){
                date = new Date(year, month, day, i, minutes, seconds, milliseconds);
                expect(dateConverter.to12HourString(date)).to.equal(i%12+":00 PM");
            }
        });
    });
});