var dateConverter = {};

/**
 * This function converts the date passed in to a 12 hour string
 * @param date  The date to convert
 * @author      sullivan-bormannaj
 */
dateConverter.to12HourString = function(date){
    var minutes = date.getMinutes();
    if(minutes < 10){
        minutes = "0" + minutes;
    }
    var rawHours = date.getHours();
    if(rawHours < 12){
        if(rawHours === 0){
            var hours = 12;
        } else{
            var hours = rawHours;
        }
        var am = true;
    } else{
        rawHours %= 12;
        if(rawHours === 0){
            var hours = 12;
        } else{
            var hours = rawHours;
        }
        var am = false;
    }
    var time = hours + ":" + minutes;
    time += am? " AM":" PM";
    return time;
};

try {
    module.exports = dateConverter;
} catch (ReferenceError){
    //Only for tests
}