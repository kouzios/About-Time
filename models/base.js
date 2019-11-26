var repo = require('../services/repo');
var _ = require('underscore');

var method = Base.prototype;

/**
 * Constructor used to make a base object
 * @param params - Attribute information object
 * @constructor
 */
function Base(params) {
    if (_.isUndefined(this.attributes)) {
        throw new Error("Base.constructor: this.attributes must be defined.");
    }

    if (_.isUndefined(this.required)) {
        throw new Error("Base.constructor: this.required must be defined.");
    }

    if(!_.isUndefined(params)){
        _.each(this.attributes, function(e) {
            this[e] = params[e];
        }.bind(this));
    }
}

/**
 * Method used to check the required attribtues
 */
method.checkRequired = function() {
    _.each(this.required, function(key) {
        if (_.isUndefined(this[key]) || _.isNull(this[key])) {
            throw new Error("Base.checkRequired: attribute " + key + " must be defined.");
        }
    }.bind(this));
};

/**
 * This method fetches one row from from a table
 * @param id - id of the row
 */
method.fetchOne = function(id) {
    if (_.isUndefined(id) || _.isNull(id)) {
        throw new Error("base.fetchOne: id must be defined");
    }
    return repo.query('SELECT * FROM ?? WHERE ?? = ? and deleted_at IS NULL', [this.table, this.table + '_id', id]);
};

/**
 * This method updates a row in a table
 */
method.update = function() {
    this.checkRequired();

    var model_params = _.reduce(this.attributes, function(acc, e) {
        if (!_.isUndefined(this[e]) && !_.isNull(this[e])) {
            acc[e] = this[e];
        }
        return acc;
    }.bind(this), {});

    if (_.isEmpty(model_params)) {
        throw new Error("Base.insert: parameters must be provided. Model given: ", this);
    }

    model_params.updated_at = new Date();
    // if (_.isUndefined(this.id) || _.isNull(this.id)) {
    //   throw new Error("base.update: id must be defined");
    // }
    return repo.query('UPDATE ?? SET ? WHERE ?? = ?', [this.table, model_params, this.table + '_id', this[this.table + "_id"]]);
};

/**
 * This method fetches all the rows of a table
 */
method.fetchAll = function() {
    return repo.query('SELECT * FROM ?? WHERE deleted_at IS NULL', [this.table]);
};

/**
 * This method updates the 'deleted_at' value for a row
 * @param id - row to be updated
 */
method.remove = function(id) {
    if (_.isUndefined(id) || _.isNull(id)) {
        throw new Error("base.remove: id must be defined");
    }
    return repo.query('UPDATE ?? SET deleted_at = (select NOW()) WHERE ?? = ?', [this.table, this.table + '_id', id]);
};

/**
 * This method inserts a model into the database
 * @returns {*}
 */
method.insert = function() {
    this.checkRequired();

    var model_params = _.reduce(this.attributes, function(acc, e) {
        if (!_.isUndefined(this[e]) && !_.isNull(this[e])) {
            acc[e] = this[e];
        }
        return acc;
    }.bind(this), {});

    if (_.isEmpty(model_params)) {
        throw new Error("Base.insert: parameters must be provided. Model given: ", this);
    }

    var now = new Date();
    model_params.updated_at = now;
    model_params.inserted_at = now;

    return repo.query('INSERT into ?? SET ?', [this.table, model_params]);
};

module.exports = Base;

