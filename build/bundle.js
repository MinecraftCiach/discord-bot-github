'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var express = _interopDefault(require('express'));
var bodyParser = _interopDefault(require('body-parser'));
var mongodb = _interopDefault(require('mongodb'));
var discord_js = require('discord.js');
var promise = _interopDefault(require('promise'));

var CommandChecker = (function () {
    function CommandChecker() {
    }
    CommandChecker.isValid = function (input) {
        var command = input.split(" ");
        if (command[0] !== "!dbg")
            return false;
        if (!CommandChecker.commands[command[1]])
            return false;
        if (command.length > 3)
            return false;
        return true;
    };
    CommandChecker.getCommand = function (input) {
        if (CommandChecker.isValid(input)) {
            return { command: input.split(" ")[1], argument: input.split(" ")[2] };
        }
        else {
            return undefined;
        }
    };
    CommandChecker.commands = {
        "add": true,
        "remove": true,
        "token": true,
        "help": true,
    };
    return CommandChecker;
}());

var config = (function () {
    function config() {
    }
    config.db = "mongodb://discobot:amn4apwet@ds021994.mlab.com:21994/discobot";
    config.token = "MTkzMDAwNDQzOTgxNDYzNTUy.CnA48g.r4ZawiPPPE4gXRSpSzBQdRBffiE";
    return config;
}());

var MongoClient$1 = mongodb.MongoClient;
var Actions = (function () {
    function Actions() {
    }
    Actions.add = function (repo, channelId) {
        return new promise(function (resolve, reject) {
            MongoClient$1.connect(config.db, function (err, db) {
                if (err)
                    reject(err);
                db.collection("subscriptions").deleteMany({
                    "repo": repo.toLowerCase(),
                    "channelId": channelId
                }, function (err, result) {
                    if (err)
                        reject(err);
                    db.collection("subscriptions").insertOne({
                        "repo": repo.toLowerCase(),
                        "channelId": channelId
                    }, function (err, result) {
                        if (err)
                            reject(err);
                        db.close();
                        resolve("Successfully added a new subscription. " + repo + " <-> " + channelId);
                    });
                });
            });
        });
    };
    Actions.remove = function (repo, channelId) {
        return new promise(function (resolve, reject) {
            MongoClient$1.connect(config.db, function (err, db) {
                if (err)
                    reject(err);
                db.collection("subscriptions").deleteOne({
                    "repo": repo.toLowerCase(),
                    "channelId": channelId
                }, function (err, result) {
                    if (err)
                        reject(err);
                    db.close();
                    resolve("Successfuly removed a subscription. " + repo + " </> " + channelId);
                });
            });
        });
    };
    Actions.token = function (token, userId) {
        if (token) {
            Actions.addToken(token, userId);
        }
        else {
            Actions.removeToken(token, userId);
        }
    };
    Actions.addToken = function (token, userId) {
        return new promise(function (resolve, reject) {
            MongoClient$1.connect(config.db, function (err, db) {
                if (err)
                    reject(err);
                db.collection("tokens").deleteMany({
                    "userId": userId,
                    "token": token
                }, function (err, result) {
                    if (err)
                        reject(err);
                    db.collection("tokens").insertOne({
                        "userId": userId,
                        "token": token
                    }, function (err, result) {
                        if (err)
                            reject(err);
                        db.close();
                        resolve("Successfully added a token.");
                    });
                });
            });
        });
    };
    Actions.removeToken = function (token, userId) {
        return new promise(function (resolve, reject) {
            MongoClient$1.connect(config.db, function (err, db) {
                if (err)
                    reject(err);
                db.collection("tokens").deleteOne({
                    "userId": userId,
                    "token": token
                }, function (err, result) {
                    if (err)
                        reject(err);
                    db.close();
                    resolve("Successfully removed a token.");
                });
            });
        });
    };
    Actions.help = function (message) {
        var helpMessage = "```\nUsage: !dbg <command> [value]\n\nCommands:\n  add <repo> ....... adds a subscription for the current channel\n  remove <repo> .... removes a subscription for the current channel\n  help ............. displays this text```";
        message.reply(helpMessage);
    };
    return Actions;
}());

var Events = (function () {
    function Events() {
    }
    Events.commit_comment = function (data) {
        var message = "";
        var repo = data.repository.full_name;
        var commit = data.comment.commit_id.substring(0, 7);
        var user = data.comment.user.login;
        message += "[**" + repo + " _" + commit + "_**] New comment on commit by " + user;
        message += "\n" + data.comment.body;
        return message;
    };
    Events.create = function (data) {
        var type = data.ref_type;
        var repo = data.repository.full_name;
        var user = data.sender.login;
        return "[**" + repo + "**] " + user + " created a " + type + ": " + data.ref;
    };
    Events.delete = function (data) {
        var type = data.ref_type;
        var repo = data.repository.full_name;
        var user = data.sender.login;
        return "[**" + repo + "**] " + user + " deleted a " + type + ": " + data.ref;
    };
    Events.deployment = function (data) {
        return null;
    };
    Events.deployment_status = function (data) {
        return null;
    };
    Events.fork = function (data) {
        var repo = data.repository.full_name;
        var fork = data.forkee.full_name;
        return "[**" + repo + "**] -> *" + fork + "*\nFork created.";
    };
    Events.gollum = function (data) {
        var repo = data.repository.full_name;
        var user = data.sender.login;
        var pages = data.pages;
        var message = "[**" + repo + "**] Wiki was updated by " + user + ".";
        pages.forEach(function (page) { return message += "\n**" + page.title + ":** " + page.action; });
        return message;
    };
    Events.issue_comment = function (data) {
        var repo = data.repository.full_name;
        var user = data.comment.user.login;
        var url = data.comment.html_url;
        var body = data.comment.body;
        var title = data.issue.title;
        var message = "[**" + repo + "**] Comment created on issue: " + title;
        message += "\n" + url;
        message += "\n" + body;
        return message;
    };
    Events.issues = function (data) {
        var repo = data.repository.full_name;
        var action = data.action;
        var user = data.issue.user.login;
        var url = data.issue.html_url;
        return "[**" + repo + "**] Issue " + action + " by " + user + "\n" + url;
    };
    Events.member = function (data) {
        var repo = data.repository.full_name;
        var user = data.member.login;
        var url = data.member.html_url;
        return "[**" + repo + "**] New collaborator added: " + user + "\n" + url;
    };
    Events.membership = function (data) {
        return null;
    };
    Events.page_build = function (data) {
        return null;
    };
    Events.public = function (data) {
        var repo = data.repository.full_name;
        return "[**" + repo + "**] Has been made open source!";
    };
    Events.pull_request_review_comment = function (data) {
        var repo = data.repository.full_name;
        var action = data.action;
        var user = data.comment.user.login;
        var body = data.comment.body;
        var url = data.comment.html_url;
        var message = "[**" + repo + "**] Pull Request comment " + action + " by " + user + ":";
        message += "\n" + body;
        message += "\n" + url;
        return message;
    };
    Events.pull_request = function (data) {
        var repo = data.repository.full_name;
        var action = data.action;
        var user = data.pull_request.user.login;
        var body = data.pull_request.body;
        var url = data.pull_request.html_url;
        var message = "[**" + repo + "**] Pull Request " + action + " by " + user + ":";
        message += "\n" + body;
        message += "\n" + url;
        return message;
    };
    Events.push = function (data) {
        var message = "";
        var repo = data.repository.full_name;
        var branch = data.ref.split("/")[2];
        if (data.commits.length === 1) {
            var commit = data.commits[0];
            var name = commit.author.name;
            var commitMessage = commit.message;
            var sha = commit.id.substring(0, 7);
            var url = "https://github.com/" + repo + "/commit/" + sha;
            message += "[**" + repo + ":" + branch + "**] 1 new commit by " + name;
            message += "\n" + commitMessage + " - " + name;
            message += "\n" + url;
        }
        else {
            var commits = data.commits;
            message += "[**" + repo + ":" + branch + "**] " + commits.length + " new commits";
            for (var _i = 0, commits_1 = commits; _i < commits_1.length; _i++) {
                var commit = commits_1[_i];
                var sha = commit.id.substring(0, 7);
                var url = "https://github.com/" + repo + "/commit/" + sha;
                message += "\n" + commit.message + " - " + commit.author.name;
                message += "\n" + url;
            }
        }
        return message;
    };
    Events.repository = function (data) {
        return null;
    };
    Events.release = function (data) {
        var repo = data.repository.full_name;
        var user = data.release.author.login;
        var url = data.release.html_url;
        return "[**" + repo + "**] Release published by " + user + ":\n" + url;
    };
    Events.status = function (data) {
        var repo = data.repository.full_name;
        var description = data.description;
        var state = data.state;
        var url = data.target_url;
        var branch = data.branches.length > 0 ? data.branches[0].name : null;
        var commitMsg = data.commit.message;
        return "[**" + repo + "**] " + description + "\n" + branch + ": " + commitMsg + "\nState: " + state + " " + url;
    };
    Events.team_add = function (data) {
        return null;
    };
    Events.watch = function (data) {
        var repo = data.repository.full_name;
        var user = data.sender.login;
        return "[**" + repo + "**] Starred by " + user;
    };
    Events.ping = function (data) {
        return null;
    };
    return Events;
}());

var MongoClient = mongodb.MongoClient;
var bot = new discord_js.Client({
    autoReconnect: true
});
bot.on("message", function (message) {
    if (message.author.id === bot.user.id)
        return;
    var command = CommandChecker.getCommand(message.content);
    if (command) {
        var id = (command.command === "token") ? message.author.id : message.channel.id;
        if (command.command === "help") {
            Actions.help(message);
        }
        else {
            Actions[command.command](command.argument, id)
                .then(function (result) {
                message.reply(result);
            })
                .catch(function (err) {
                console.error(err);
            });
        }
    }
});
var app = express();
app.use(bodyParser.json());
app.post("/", function (req, res) {
    var event = req.get("X-GitHub-Event");
    var message = Events[event](req.body);
    var repo = req.body.repository.full_name.toLowerCase();
    sendMessages(repo, message);
    res.send(200);
});
app.get("/", function (req, res) {
    res.send("This address is not meant to be accessed by a web browser. Please read the readme on GitHub.");
});
function sendMessages(repo, message) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect(config.db, function (err, db) {
            if (err)
                reject(err);
            db.collection("subscriptions").find({
                "repo": repo
            })
                .toArray(function (err, subscriptions) {
                for (var _i = 0, subscriptions_1 = subscriptions; _i < subscriptions_1.length; _i++) {
                    var subscription = subscriptions_1[_i];
                    if (subscription.repo === repo.toLowerCase()) {
                        console.log("Sending:", repo, message);
                        bot.channels.find('id', subscription.channelId).sendMessage(message);
                    }
                }
                db.close();
            });
        });
    });
}
app.listen(process.env.PORT || 8080, function () {
    bot.login(config.token)
        .then(function (result) { return console.log("Logged in", result); })
        .catch(function (error) { return console.log(error); });
});