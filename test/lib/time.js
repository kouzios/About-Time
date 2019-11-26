var expect = require('chai').expect;
var time = require('../../lib/time');
var moment = require('moment');

describe('Time', function() {
  describe('format', function() {
    it('formats a moment date to YYYY-MM-DD', function() {
      var moment_date = moment("2017-01-01");
      expect(time.format(moment_date)).to.equal("2017-01-01");
    });
  });

  describe('getStartOfWeek', function() {
    it('throws error when startdate is undefined', function() {
      var throwFunction = function() {
        time.getStartOfWeek();
      };
      expect(throwFunction).to.throw(/time.getStartOfWeek: startdate must be defined./);
    }); 

    it('throws error when startdate is null', function() {
      var throwFunction = function() {
        time.getStartOfWeek(null);
      };
      expect(throwFunction).to.throw(/time.getStartOfWeek: startdate must be defined./);
    }); 

    it('gets the start of the week for a provided start day', function() {
      expect(time.getStartOfWeek("2017-01-01")).to.equal("2016-12-26");
      expect(time.getStartOfWeek("2017-01-08")).to.equal("2017-01-02");
    });
  });

  describe('getEndOfWeek', function() {
    it('throws error when startdate is undefined', function() {
      var throwFunction = function() {
        time.getEndOfWeek();
      };
      expect(throwFunction).to.throw(/time.getStartOfWeek: startdate must be defined./);
    }); 

    it('throws error when startdate is null', function() {
      var throwFunction = function() {
        time.getEndOfWeek(null);
      };
      expect(throwFunction).to.throw(/time.getStartOfWeek: startdate must be defined./);
    });

    it('should get the end of the week as a Sunday', function() {
      expect(time.getEndOfWeek("2017-01-01")).to.equal("2017-01-01"); 
      expect(time.getEndOfWeek("2017-01-02")).to.equal("2017-01-08"); 
    });
  });

  describe('getDay', function() {
    it('throws error when date is undefined', function() {
      var throwFunction = function() {
        time.getDay();
      };
      expect(throwFunction).to.throw(/time.getDay: date must be defined./);
    }); 

    it('throws error when date is null', function() {
      var throwFunction = function() {
        time.getDay(null);
      };
      expect(throwFunction).to.throw(/time.getDay: date must be defined./);
    });

    it('should return the day in DD format', function() {
      expect(time.getDay("2017-01-01")).to.equal("01"); 
      expect(time.getDay("2017-01-02")).to.equal("02"); 
      expect(time.getDay("2017-01-10")).to.equal(10); 
    });
  });

  describe('formatDay', function() {
    it('throws error when date is undefined', function() {
      var throwFunction = function() {
        time.formatDay();
      };
      expect(throwFunction).to.throw(/time.formatDay: date must be defined./);
    }); 

    it('throws error when date is null', function() {
      var throwFunction = function() {
        time.formatDay(null);
      };
      expect(throwFunction).to.throw(/time.formatDay: date must be defined./);
    });

    it('should return the day in DDD format', function() {
      expect(time.formatDay("2017-01-01")).to.equal("Sun"); 
      expect(time.formatDay("2017-01-02")).to.equal("Mon"); 
      expect(time.formatDay("2017-01-03")).to.equal("Tue"); 
      expect(time.formatDay("2017-01-04")).to.equal("Wed"); 
      expect(time.formatDay("2017-01-05")).to.equal("Thu"); 
      expect(time.formatDay("2017-01-06")).to.equal("Fri"); 
      expect(time.formatDay("2017-01-07")).to.equal("Sat");
    });
  });

  describe('formatMonth', function() {
    it('throws error when date is undefined', function() {
      var throwFunction = function() {
        time.formatMonth();
      };
      expect(throwFunction).to.throw(/time.formatMonth: date must be defined./);
    }); 

    it('throws error when date is null', function() {
      var throwFunction = function() {
        time.formatMonth(null);
      };
      expect(throwFunction).to.throw(/time.formatMonth: date must be defined./);
    });

    it('should return the day in DDD format', function() {
      expect(time.formatMonth("2017-01-01")).to.equal("Jan"); 
      expect(time.formatMonth("2017-02-02")).to.equal("Feb"); 
      expect(time.formatMonth("2017-03-03")).to.equal("Mar"); 
      expect(time.formatMonth("2017-04-04")).to.equal("Apr"); 
      expect(time.formatMonth("2017-05-05")).to.equal("May"); 
      expect(time.formatMonth("2017-06-06")).to.equal("Jun"); 
      expect(time.formatMonth("2017-07-07")).to.equal("Jul");
      expect(time.formatMonth("2017-08-02")).to.equal("Aug"); 
      expect(time.formatMonth("2017-09-03")).to.equal("Sep"); 
      expect(time.formatMonth("2017-10-04")).to.equal("Oct"); 
      expect(time.formatMonth("2017-11-05")).to.equal("Nov"); 
      expect(time.formatMonth("2017-12-06")).to.equal("Dec");
    });
  });

  describe('getTotalDays', function() {
    it('throws error when date is undefined', function() {
      var throwFunction = function() {
        time.getTotalDays();
      };
      expect(throwFunction).to.throw(/time.getTotalDays: date must be defined./);
    }); 

    it('throws error when date is null', function() {
      var throwFunction = function() {
        time.getTotalDays(null);
      };
      expect(throwFunction).to.throw(/time.getTotalDays: date must be defined./);
    });

    it('should return the total days in range', function() {
      expect(time.getTotalDays("2017-01-01", "2017-01-01")).to.equal(1); 
      expect(time.getTotalDays("2017-01-07", "2017-01-02")).to.equal(6); 
      expect(time.getTotalDays("2017-01-22", "2017-01-03")).to.equal(20);
    });
  });

  describe('getStartOfMonth', function() {
    it('throws error when date is undefined', function() {
      var throwFunction = function() {
        time.getStartOfMonth();
      };
      expect(throwFunction).to.throw(/time.getStartOfMonth: startdate must be defined./);
    }); 

    it('throws error when date is null', function() {
      var throwFunction = function() {
        time.getStartOfMonth(null);
      };
      expect(throwFunction).to.throw(/time.getStartOfMonth: startdate must be defined./);
    });

    it('should return the the start of the month is MMMM-YY-DD', function() {
      expect(time.getStartOfMonth("2017-01-01")).to.equal("2017-01-01"); 
      expect(time.getStartOfMonth("2017-02-02")).to.equal("2017-02-01"); 
      expect(time.getStartOfMonth("2017-03-03")).to.equal("2017-03-01"); 
      expect(time.getStartOfMonth("2017-04-04")).to.equal("2017-04-01"); 
      expect(time.getStartOfMonth("2017-05-05")).to.equal("2017-05-01"); 
      expect(time.getStartOfMonth("2017-06-06")).to.equal("2017-06-01"); 
      expect(time.getStartOfMonth("2017-07-07")).to.equal("2017-07-01");
      expect(time.getStartOfMonth("2017-08-02")).to.equal("2017-08-01"); 
      expect(time.getStartOfMonth("2017-09-03")).to.equal("2017-09-01"); 
      expect(time.getStartOfMonth("2017-10-04")).to.equal("2017-10-01"); 
      expect(time.getStartOfMonth("2017-11-05")).to.equal("2017-11-01"); 
      expect(time.getStartOfMonth("2017-12-06")).to.equal("2017-12-01");
    });
  });

  describe('getEndOfMonth', function() {
    it('throws error when date is undefined', function() {
      var throwFunction = function() {
        time.getEndOfMonth();
      };
      expect(throwFunction).to.throw(/time.getEndOfMonth: startdate must be defined./);
    }); 

    it('throws error when date is null', function() {
      var throwFunction = function() {
        time.getEndOfMonth(null);
      };
      expect(throwFunction).to.throw(/time.getEndOfMonth: startdate must be defined./);
    });

    it('should return the the end of the month is MMMM-YY-DD', function() {
      expect(time.getEndOfMonth("2017-01-01")).to.equal("2017-01-31"); 
      expect(time.getEndOfMonth("2017-02-02")).to.equal("2017-02-28"); 
      expect(time.getEndOfMonth("2017-03-03")).to.equal("2017-03-31"); 
      expect(time.getEndOfMonth("2017-04-04")).to.equal("2017-04-30"); 
      expect(time.getEndOfMonth("2017-05-05")).to.equal("2017-05-31"); 
      expect(time.getEndOfMonth("2017-06-06")).to.equal("2017-06-30"); 
      expect(time.getEndOfMonth("2017-07-07")).to.equal("2017-07-31");
      expect(time.getEndOfMonth("2017-08-02")).to.equal("2017-08-31"); 
      expect(time.getEndOfMonth("2017-09-03")).to.equal("2017-09-30"); 
      expect(time.getEndOfMonth("2017-10-04")).to.equal("2017-10-31"); 
      expect(time.getEndOfMonth("2017-11-05")).to.equal("2017-11-30"); 
      expect(time.getEndOfMonth("2017-12-06")).to.equal("2017-12-31");
    });
  });

  describe('getWeek', function() {
    it('throws error when startdate is undefined', function() {
      var throwFunction = function() {
        time.getWeek();
      };
      expect(throwFunction).to.throw(/time.getWeek: startdate must be defined/);
    }); 

    it('throws error when startdate is null', function() {
      var throwFunction = function() {
        time.getWeek(null);
      };
      expect(throwFunction).to.throw(/time.getWeek: startdate must be defined/);
    });

    it('should return the the start and end of a week', function() {
      expect(time.getWeek("2017-01-01").start).to.equal("2016-12-26");
      expect(time.getWeek("2017-01-01").end).to.equal("2017-01-01");
    });
  });

  describe('getWeeks', function() {
    it('throws error when startdate is undefined', function() {
      var throwFunction = function() {
        time.getWeeks();
      };
      expect(throwFunction).to.throw(/time.getWeeks: startdate must be defined./);
    }); 

    it('throws error when startdate is null', function() {
      var throwFunction = function() {
        time.getWeeks(null);
      };
      expect(throwFunction).to.throw(/time.getWeeks: startdate must be defined./);
    });

    it('should return the the start and end of a week', function() {
      expect(time.getWeeks("2017-01-01", 2).start).to.equal("2016-12-26");
      expect(time.getWeeks("2017-01-01", 2).end).to.equal("2017-01-08");
    });
  });

  describe('getMonth', function() {
    it('throws error when startdate is undefined', function() {
      var throwFunction = function() {
        time.getMonth();
      };
      expect(throwFunction).to.throw(/time.getMonth: startdate must be defined./);
    }); 

    it('throws error when startdate is null', function() {
      var throwFunction = function() {
        time.getMonth(null);
      };
      expect(throwFunction).to.throw(/time.getMonth: startdate must be defined./);
    });

    it('should return the the start and end of a week', function() {
      expect(time.getMonth("2017-01-01").start).to.equal("2017-01-01");
      expect(time.getMonth("2017-01-01").end).to.equal("2017-01-31");
    });
  });

  describe('isBetween', function() {
    it('throws error when startdate is undefined', function() {
      var throwFunction = function() {
        time.isBetween();
      };
      expect(throwFunction).to.throw(/time.isBetween: start date must be defined./);
    }); 

    it('throws error when startdate is null', function() {
      var throwFunction = function() {
        time.isBetween(null);
      };
      expect(throwFunction).to.throw(/time.isBetween: start date must be defined./);
    });

    it('should return the the start and end of a week', function() {
      expect(time.isBetween("2017-01-01", "2017-01-31", "2016-12-31")).to.equal(false);
      expect(time.isBetween("2017-01-01", "2017-01-31", "2017-01-01")).to.equal(true);
      expect(time.isBetween("2017-01-01", "2017-01-31", "2017-01-11")).to.equal(true);
      expect(time.isBetween("2017-01-01", "2017-01-31", "2017-01-31")).to.equal(true);
      expect(time.isBetween("2017-01-01", "2017-01-31", "2017-02-01")).to.equal(false);
    });
  });
});

