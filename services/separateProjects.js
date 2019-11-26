var separateProject = {};

/** The purpose of this module is to separate multiple projects
 * When requesting projects for Dashboard view, it will provide all
 * the projects in a single Results object.
 * This class will focus on splitting the results up by users, so that it can
/* be displayed by project.

 @author griggszm@msoe.edu

/**
 * Main driver method to convert a combined results object into
 * a results object with multiple projects listed.
 *
 * @param results       Results array from the getAllTasks.
 * @param keys          Array of project keys
 * @param names         Array of project names (must correspond to keys)
 * @param projCount     How many projects there are total
 * @returns {Object}    New results, with projects as sub-items.
 */
separateProject.separate = function(results, keys, names, projCount) {
    var complete_results = new Object();

    for(var i = 0; i < projCount; i++) {
        complete_results[keys[i]]=separateProject.resultsForProject(results, keys[i], names[i]);
    }

    return complete_results;
};

/**
 * Creates a results for a single project, name, and key
 * by extracting it from the old results object
 *
 * @param results       Old results object
 * @param key           Project key to get results for
 * @param name          Project name to get results for
 * @returns {Object}    Results object in the same format as the original
 */
separateProject.resultsForProject = function(results, key, name) {
    var results_new = new Object();
    results_new.totalDays = results.totalDays;
    results_new.name = name;
    results_new.task_array = [];
    separateProject.fillTaskArray(results.task_array, results_new.task_array, key);
    results_new.user_array = new Object();
    separateProject.fillUserArray(results.user_array, results_new.user_array, key);
    results_new.sorted_usernames = [];
    separateProject.fillSortedUsernames(results_new.user_array, results_new.sorted_usernames);
    return results_new;
};

/**
 * Fills a task array with tasks from this project by extracting them from the old results.
 *
 * @param old_tasks Task array with all tasks
 * @param new_tasks Task array to fill with new tasks
 * @param key       Project key
 */
separateProject.fillTaskArray = function(old_tasks, new_tasks, key) {
    for(var t in old_tasks) {
        var task = old_tasks[t];
        if(task.key.startsWith(key)) {
            new_tasks.push(task);
        }
    }
};

/**
 * Fills the user object with the users for only this project by
 * extracting them from the object of all users.
 *
 * @param old_users User object containing all users
 * @param new_users User object containing only users for this project
 * @param key       Project key
 */
separateProject.fillUserArray = function(old_users, new_users, key) {
    for(var username in old_users) {
        var user = old_users[username];
        var times = user.dailyTime;
        for(var single in times) {
            var singleTime = times[single];
            var work = singleTime.worklogs;
            if(work.id && work.id != "") {
                var id = work.id;
                for(var singleId in id) {
                    if(id[singleId].startsWith(key)) {
                        new_users[username] = user;
                    }
                }
            }
        }
    }
};

/**
 * Fills the array of sorted usernames by using the usernames for this project.
 *
 * @param user_array        Object containing names for only this project
 * @param sorted_usernames  Sorted usernames for only this project
 */
separateProject.fillSortedUsernames = function(user_array, sorted_usernames) {
    for(var user in user_array) {
        sorted_usernames.push(user);
    }
    sorted_usernames.sort();
};

module.exports = separateProject;