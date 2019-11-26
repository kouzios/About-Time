/**
 * @author griggszm@msoe.edu
 */

require('dotenv').config();
var expect = require('chai').expect;
var audit = require('../../services/audit.js');

function makeStringDate(year, month, day, hour, minute, second) {
    return year + "-" + month + "-" + day + "T" + hour + ":" + minute + ":" + second + ".000-0000";
}

describe('AuditTimelogs', function() {
    describe('audit', function() {
        it('should flag too many hours in a row', function() {
            var flagAfter = audit.get_flag_after_hour_single() * audit.get_seconds_per_hour();
            expect(audit.audit_over_hours(0)).to.equal(false); //No time
            expect(audit.audit_over_hours(flagAfter - 1)).to.equal(false); //Misses flagging by 1 second
            expect(audit.audit_over_hours(flagAfter)).to.equal(true); //Exactly the time to flag
            expect(audit.audit_over_hours(flagAfter+1)).to.equal(true); //More than time to flag
        });

        it('should flag too many hours in a day', function() {
            var flagAfter = audit.get_flag_after_hour_day() * audit.get_seconds_per_hour();
            expect(audit.audit_over_hours_full_day(0)).to.equal(false); //No time
            expect(audit.audit_over_hours_full_day(flagAfter-1)).to.equal(false); //Misses flagging by 1 second
            expect(audit.audit_over_hours_full_day(flagAfter)).to.equal(true); //Exactly the time to flag
            expect(audit.audit_over_hours_full_day(flagAfter+1)).to.equal(true); //More than time to flag
        });

        it('should flag for empty description', function() {
            expect(audit.audit_blank_description("desc")).to.equal(false); //Non-blank description, should not be flagged
            expect(audit.audit_blank_description(" ")).to.equal(false); //Non-blank description, should not be flagged
            expect(audit.audit_blank_description(undefined)).to.equal(true); //Empty, should be flagged
            expect(audit.audit_blank_description("")).to.equal(true); //Empty, should be flagged
        });

        it('should flag for an entry too far in the past', function() {
            var days_in_past = audit.get_flag_after_late_logging();
            var day = 1 + days_in_past;

            expect(audit.audit_logged_in_the_past(
                makeStringDate("2017","01","01","02","00","00"),
                makeStringDate("2017","01","01","01","00","00"))).to.equal(false); //Same day
            expect(audit.audit_logged_in_the_past(
                makeStringDate("2017","01",day,"02","00","00"),
                makeStringDate("2017","01","01","02","00","00"))).to.equal(false); //Exactly equal to time, should not be flagged
            expect(audit.audit_logged_in_the_past(
                makeStringDate("2017","01",day,"01","59","59"),
                makeStringDate("2017","01","01","01","00","00"))).to.equal(true); //Flagged by one second
            expect(audit.audit_logged_in_the_past(
                makeStringDate("2018","01",day,"02","00","00"),
                makeStringDate("2017","01","01","02","00","00"))).to.equal(true); //Flagged by 1 year
        });

        it('should flag for overlapping times', function() {
            // Second timelog is far past first one
            expect(audit.audit_overlapping_time(
                60,
                makeStringDate("2017","01","01","02","00","00"),
                makeStringDate("2017","01","01","05","00","00"))).to.equal(false);
            // Second timelog starts exactly where first ends
            expect(audit.audit_overlapping_time(
                60,
                makeStringDate("2017","01","01","02","00","00"),
                makeStringDate("2017","01","01","02","01","00"))).to.equal(false);
            // Second timelog starts 1 second before first one ends
            expect(audit.audit_overlapping_time(
                3601,
                makeStringDate("2017","01","01","02","00","00"),
                makeStringDate("2017","01","01","03","00","00"))).to.equal(true);
            // Second timelog starts in the middle of the first one
            expect(audit.audit_overlapping_time(
                3601,
                makeStringDate("2017","01","01","02","00","00"),
                makeStringDate("2017","01","01","02","10","00"))).to.equal(true);
        });
    });
});