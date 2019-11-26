var _ = require("underscore"),
    repo = require('../services/repo'),
    _super = require("./base").prototype,
    method = Organization.prototype = Object.create(_super);

method.constructor = Organization;

/**
 * This class is used to model an organization in our SQL database
 * @param params - Attributes of the organization
 * @constructor
 */
function Organization(params) {
    this.table = "organization";
    this.attributes = ["organization_id", "client_key", "public_key", "jira_shared_secret", "confluence_shared_secret", "server_version", "plugins_version", "base_url", "deleted_at", "inserted_at", "updated_at"];
    this.required = ["client_key", "public_key", "jira_shared_secret", "confluence_shared_secret", "base_url"];

    _super.constructor.apply(this, [params]);

    /**
     * This method is used to select an organization from the database that has matching base url
     * @param base_url - url to check for in the database
     * @returns {*} - the organization object where the base_url matches
     */
    this.fetchByHost = function(base_url) {
        if(base_url[base_url.length - 1] == '/')
            base_url = base_url.substring(0, base_url.length - 2);
        base_url += '%';
        return repo.query('SELECT * FROM ?? WHERE base_url like ? and deleted_at is NULL order by updated_at desc LIMIT 1;', [this.table, base_url]);
    };

    /**
     * This method is used to remove an organization from the database. Technically it just sets the current organization's
     * deleted_at to the current date.
     * @returns {*}
     */
    this.remove = function (){
        var model_params = _.reduce(this.attributes, function(acc, e) {
            if (!_.isUndefined(this[e]) && !_.isNull(this[e])) {
                acc[e] = this[e];
            }
            return acc;
        }.bind(this), {});

        if (_.isEmpty(model_params)) {
            throw new Error("Organization.remove: parameters must be provided. Model given: ", this);
        }

        return repo.query('UPDATE organization SET deleted_at = (select NOW()) WHERE client_key = ? and public_key = ? and server_version = ? and plugins_version = ? and base_url = ?',
            [model_params.client_key, model_params.public_key, model_params.server_version, model_params.plugins_version, model_params.base_url]);
    };

    /**
     * This method is used to set an existing organizations Confluence key
     * @returns {*}
     */
    this.setConfluenceKey = function () {
        var model_params = _.reduce(this.attributes, function(acc, e) {
            if (!_.isUndefined(this[e]) && !_.isNull(this[e])) {
                acc[e] = this[e];
            }
            return acc;
        }.bind(this), {});

        if (_.isEmpty(model_params)) {
            throw new Error("Organization.setConfluenceKey: parameters must be provided. Model given: ", this);
        }

        var response = repo.query('UPDATE organization SET confluence_shared_secret = ? WHERE base_url = ?',
            [model_params.confluence_shared_secret, model_params.base_url]);

        if(response === null){
            throw new Error("Organization.setConfluenceKey: Corresponding JIRA Add-on must be provided.");
        }

        return response;
    }
}

module.exports = Organization;

