'use strict';

var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db, callback) {
  db.createTable('organization', {
    organization_id: {type: 'int', primaryKey: true, autoIncrement: true},
    client_key: {type: 'string', notNull: true},
    public_key: {type: 'string', notNull: true},
    jira_shared_secret: {type: 'string', notNull: true},
    confluence_shared_secret: {type: 'string', notNull: true},
    server_version: {type: 'string'},
    plugins_version: {type: 'string'},
    base_url: {type: 'string', notNull: true},
    deleted_at: 'datetime',
    updated_at: {
      type: 'datetime',
      notNull: true
    },
    inserted_at: {
      type: 'datetime',
      notNull: true
    }
  }, callback);
  return null;
};

exports.down = function(db, callback) {
  db.dropTable('organization', callback);
};

exports._meta = {
  "version": 1
};
