var api = {
  resourcePath: '/github/pull_request/',
  models: {
    TaskList: {
      id: 'TaskList',
      properties: {
        taskIds: {
          description: 'An array of task ids as defined by taskcluster',
          type: 'array',
          items: {
            type: 'string'
          }
        }
      }
    }
  },
  apis: [
    {
      path: '/github/pull_request/',
      operations: [
        {
          summary:
            'Handle incoming pull requests and link them to treeherder',

          httpMethod: 'POST',
          nickname: 'post',
          responseClass: 'TaskList'
        }
      ]
    }
  ]
};

var Promise = require('promise');
var TreeherderGithub = require('mozilla-treeherder/github');
var TreeherderProject = require('mozilla-treeherder/project');

var githubGraph = require('../graph/github_pr');
var debug = require('debug')('gaia-treeherder/github/pull_request');

function findProject(projects, user, repo) {
  var i = 0;
  var len = projects.length;

  for (; i < len; i++) {
    var proj = projects[i];
    if (proj.user === user && proj.repo === repo) {
      return proj;
    }
  }
}

var controller = {
  post: function(req, res, next) {
    var body = req.body;
    var ghRepository = body.repository;
    var ghPr = body.pull_request;
    var ghAction = body.action;

    // ack closed pull requests but don't create any resources in th or
    // tc.
    if (ghAction === 'closed') {
      return res.send(200);
    }

    if (!ghPr) {
      var err = new Error('Invalid pull request data');
      err.status = 400;
      return next(err);
    }

    // taskcluster queue
    var queue = res.app.get('queue');
    // taskcluster graph
    var graph = res.app.get('graph');

    // github client
    var github = res.app.get('github');

    // project configuration
    var projects = res.app.get('projects');

    // github params
    var user = ghRepository.owner.login;
    var repo = ghRepository.name;
    var number = ghPr.number;

    var project = findProject(projects, user, repo);
    if (!project) {
      var err = new Error('Cannot handle requests for this github project');
      err.status = 400;
      return next(err);
    }

    // project is valid so lets continue...
    TreeherderGithub.pull(project.name, {
      github: github,
      repo: repo,
      user: user,
      number: number
    }).then(function(resultset) {
      resultset.revision_hash = githubGraph.pullRequestResultsetId(ghPr);
      // submit the resultset to treeherder
      var thProject = new TreeherderProject(project.name, {
        consumerKey: project.consumerKey,
        consumerSecret: project.consumerSecret
      });

      // treeherder expects an array so just wrap our single resultset.
      return thProject.postResultset([resultset]);
    }).then(function() {

      console.log('posted resultset for ' + user + '/' + repo + ' #' + number);

      // fetch the raw graph from github
      return githubGraph.fetchGraph(github, ghPr);

    }).then(function(projectGraph) {

      // decorate the graph with the pull request
      return githubGraph.decorateGraph(
        projectGraph, github, ghPr
      ).then(
        // then post it to taskcluster for processing
        graph.create.bind(graph)
      );

    }).then(function(result) {

      // respond with the task ids (mostly for debugging and testing)
      return res.send(201, result);

    }).catch(function(err) {
      console.error('Could not generate or post resulset from github pr');
      console.error(err.stack);
      var err = new Error(
        'failed to generate resultset ' + user + '/' + repo + ' #' + number
      );
      err.status = 500;
      next(err);
    });
  }
};

module.exports = { api: api, controller: controller };
