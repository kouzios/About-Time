var assert = require('assert');

var taskArray = ['TIMELOGTST-5', 'Development', '2.50', 'Test Task', 'TIMELOGTST-4', 'Done', '4', 'Done Story'];
var hoursArray = ["", "3", "", "1.75", "", "", "", "1.75"];
var totalHoursArray = ["", "3", "", "1.75", "", "", "", "1.75", "", "", "", "", "", "", "4.75", "1.75"];
var modalHeaderArray = ["Key", "Worked", "Description"];
var modalBodyArray = ["TIMELOGTST-4", "3", "Worked on story in sdl"];
var taskURL = "https://msoese.atlassian.net/browse/TIMELOGTST-4";

module.exports = {
    before : function(browser) {
        browser
            .maximizeWindow()
            .url('https://msoese.atlassian.net/login')
            .waitForElementVisible('body', 1000)
            .setValue('input[id=username]', 'msoeatlassiantester@gmail.com')
            .setValue('input[id=password]', 'MSOETimeLogger')
            .click('button[id=login]')
            .assert.containsText('span[class=aui-header-logo-text]', 'MSOE-Jira');
    },


    'Main Screen' : function (client) {
        client
            .url('https://msoese.atlassian.net/plugins/servlet/ac/edu.msoe.jiratimelogger/timelogger')
            .waitForElementVisible('body', 1000)
            .frame(0)
            .assert.containsText('h2', 'MSOE Time Log Viewer')
            .assert.elementPresent('input[id=projectList]')
            .assert.elementPresent('input[id=sprintList]')
            .assert.containsText("button[id=date_btn]", 'Use Custom Date')
            .assert.containsText("button[id=show]", 'Submit')
            .click('input[id=showAllProjects]')
            .assert.elementPresent('input[id=from]')
            .assert.elementPresent('input[id=to]')
            .assert.containsText("button[id=sprint_btn]", 'Use Sprint List')
    },

    'End to End' : function (client) {
        client
            .url('https://msoese.atlassian.net/plugins/servlet/ac/edu.msoe.jiratimelogger/timelogger')
            .waitForElementVisible('body', 1000)
            .frame(0)
            .click('input[id=showAllProjects]')
            .waitForElementVisible('input[id=from]', 1000)
            .setValue('input[id=projectList]', 'TIMELOGTST')
            .setValue('input[id=from]', '04/10/2017')
            .setValue('input[id=to]', '04/17/2017')
            .click('button[id=show]')
            .waitForElementVisible('h1', 1000)
            .assert.containsText('h1', '04/10/2017 - 04/17/2017')
            .assert.containsText('table tbody tr td:nth-child(1)', 'msoeatlassiantester')
            .assert.containsText('table tbody tr td:nth-child(2)', '6.50')
            .assert.containsText('button[id=csvbtn]', 'Export Table as CSV')
            .elements('css selector', 'table[id=overview] tbody tr td', function(array){
                var y = 0;
                for (var x = 0; x < array.value.length; x++) {
                    client.elementIdText(array.value[x].ELEMENT, function (obj) {
                        this.assert.equal(obj.value, hoursArray[y]);
                        y++
                    });
                }
            })
            .elements('css selector', 'table[id=overview] tfoot tr td', function(array){
                var y = 0;
                for (var x = 0; x < array.value.length; x++) {
                    client.elementIdText(array.value[x].ELEMENT, function (obj) {
                        this.assert.equal(obj.value, totalHoursArray[y]);
                        y++
                    });
                }
            })
            .elements('css selector', 'table[id=task] tbody tr td', function(array){
                var y = 0;
                for (var x = 0; x < array.value.length; x++) {
                    client.elementIdText(array.value[x].ELEMENT, function (obj) {
                        this.assert.equal(obj.value, taskArray[y]);
                        y++;
                    });
                }
            })
            .click('table[id=overview] tbody tr td:nth-child(2) a')
            .waitForElementVisible("div[id=taskInfoModal]", 1000)
            .assert.containsText('h4[id=taskInfoModalLabel]', 'More details for 2017-04-11')
            .assert.attributeEquals("div[class=modal-body] table tbody tr td:nth-child(1) a", "href", taskURL)
            .elements('css selector', 'div[class=modal-body] table tbody tr th', function (array) {
                var y = 0;
                for (var x = 0; x < array.value.length; x++) {
                    client.elementIdText(array.value[x].ELEMENT, function (obj) {
                        this.assert.equal(obj.value, modalHeaderArray[y]);
                        y++;
                    });
                }
            })
            .elements('css selector', 'div[class=modal-body] table tbody tr td', function (array) {
                var y = 0;
                for (var x = 0; x < array.value.length; x++) {
                    client.elementIdText(array.value[x].ELEMENT, function (obj) {
                        this.assert.equal(obj.value, modalBodyArray[y]);
                        y++;
                    });
                }
            })
            .click('button[class=close]')
            .waitForElementNotVisible("div[id=taskInfoModal]", 1000)
            .end();
    }
};