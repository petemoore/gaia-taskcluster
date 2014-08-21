function env(name, defaultValue) {
  return process.env[name] || defaultValue || '';
}

module.exports = {

  // location relative to the root of the tree where the task graph lives
  taskGraphPath: 'taskgraph.json',

  // graph level defaults
  graph: {
    routing: env('TASKCLUSTER_ROUTING_KEY') + '.',
    tags: {},
    metadata: {},
    params: {}
  },

  // task level defaults
  task: {
    provisionerId: env('TASKCLUSTER_PROVISIONER_ID', 'aws-provisioner'),
    workerType: env('TASKCLUSTER_WORKER_TYPE', 'v2'),
    retries: 5,
    timeout: 180,
    tags: {
      branch: '{{branch}}',
      commit: '{{commit}}',
      commitRef: '{{commitRef}}',
      repository: '{{repository}}',

      githubRepo: '{{githubRepo}}',
      githubUser: '{{githubUser}}',
      treeherderRepo: '{{treeherderRepo}}'
    },
    metadata: {},
    payload: {
      env: {
        CI: true,
        BRANCH: '{{branch}}',
        COMMIT: '{{commit}}',
        COMMIT_REF: '{{commitRef}}',
        REPOSITORY: '{{repository}}',

        GH_USER: '{{githubUser}}',
        GH_REPO: '{{githubRepo}}'
      },
      maxRunTime: 7200,
      features: {}
    }
  },

  taskcluster: {
    // amqp connection string...
    amqpUri: '',
    credentials: {
      clientId: process.env.TASKCLUSTER_CLIENT_ID || '',
      accessToken: process.env.TASKCLUSTER_ACCESS_TOKEN || ''
    }
  },

  treeherder: {
    // where to pull the treeherder configuration projects from...
    // XXX: Soon this will be a store
    configUri: env('TREEHEDER_PROJECT_CONFIG_URI')
  },

  github: {
    rawUrl: 'https://raw.githubusercontent.com/',
    // XXX: soon this will go away in favor or per-project configuration
    token: env('GITHUB_OAUTH_TOKEN')
  }
};