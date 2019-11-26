require('dotenv').config();
var expect = require('chai').expect;
var sinon = require('sinon');
var repo = require('../../services/repo');
var Organization = require('../../models/organization');

describe('Organization', function() {
    var data = {
        client_key: "123",
        public_key: "abc",
        jira_shared_secret: "JIRA-SECRET",
        confluence_shared_secret: "CONFLUENCE-SECRET",
        server_version: "sv1",
        plugins_version: "pv1",
        base_url: "https://www.msoe.edu"
    };
    var organization = new Organization(data);

    describe('constructor', function() {
        it('should create a organization with parameters on hook', function() {
            expect(organization.client_key === "123").to.equal(true);
            expect(organization.public_key === "abc").to.equal(true);
            expect(organization.jira_shared_secret === "JIRA-SECRET").to.equal(true);
            expect(organization.confluence_shared_secret === "CONFLUENCE-SECRET").to.equal(true);
            expect(organization.server_version === "sv1").to.equal(true);
            expect(organization.plugins_version === "pv1").to.equal(true);
            expect(organization.base_url === "https://www.msoe.edu").to.equal(true);

        });
    });

    describe('fetchByHost', function() {
        it('should pass a happy path', function() {
            sinon.stub(repo, "query");
            organization.fetchByHost("https://www.msoe.edu");
            expect(repo.query.calledOnce).to.equal(true);
            repo.query.restore();
        });
    });

    describe('remove', function() {
        it('should pass a happy path', function() {
            sinon.stub(repo, "query");
            organization.remove();
            expect(repo.query.calledOnce).to.equal(true);
            repo.query.restore();
        });

        it('throw error because organization params are null', function() {
            var emptyOrganization = new Organization();
            var throwFunction = function() {
                emptyOrganization.remove();
            };
            expect(throwFunction).to.throw(/Organization.remove: parameters must be provided. Model given: /);
        });
    });

    describe('setConfluenceSecret', function() {
        it('should pass a happy path', function() {
            sinon.stub(repo, "query");
            organization.setConfluenceKey();
            expect(repo.query.calledOnce).to.equal(true);
            repo.query.restore();
        });

        it('throw error because organization params are null', function() {
            var emptyOrganization = new Organization();
            var throwFunction = function() {
                emptyOrganization.setConfluenceKey();
            };
            expect(throwFunction).to.throw(/Organization.setConfluenceKey: parameters must be provided. Model given: /);
        });
    });
});
