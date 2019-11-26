var history = {};
var moment = require('moment');
var _ = require('underscore');

/**
 * Handles requests, adding the most recent item (pn) into recent, which keeps track of the 5 most recent projects.
 *
 * @param req The request with the 'pn' cookie
 * @param res The response (unused)
 * @param next The next middleware to be called
 */
history.run = function(req, res, next) {
    var last = req.cookies.pn;

    if(!last)
        return next();
    var list = req.cookies.recent || [];
    for(var index = list.length - 1; index >= 0; index--) {
        if (last.name === list[index].name || Date.parse(list[index].viewed) < moment().subtract(1, 'months').toDate())
            list.splice(index, 1);
    }
    last.viewed = moment().toDate();
    list.unshift(_.clone(last));
    // if(list.length > 5)  TODO use this if we want a hard limit on number of recent images.
    //     list.splice(5);

    //Fixes an issue with how the recent projects are stored if used right after the old pn cookie is used
    for(index = list.length - 1; index >= 0; index--){
        if(typeof list[index] === "string"){
            list.splice(index, 1);
        }
    }
    res.cookie('recent', list, {expires: moment().add(1, 'months').toDate()});
    req.recent = list;
    next();
};

module.exports = history;
