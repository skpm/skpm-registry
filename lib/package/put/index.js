const semver = require('semver')
const GitHubApi = require('github')
const Storage = require('../storage')

function checkIfCollaborator (github, data) {
  return new Promise(function (resolve, reject) {
    github.repos.checkCollaborator(data, function (err, res) {
      if (err) {
        return reject(err)
      }
      resolve(res)
    })
  })
}

function getCurrentUser (github) {
  return new Promise(function (resolve, reject) {
    github.users.get(function (err, res) {
      if (err) {
        return reject(err)
      }
      resolve(res)
    })
  })
}

module.exports.handler = function (event, context) {
  const name = decodeURIComponent(event.name)
  var pkg
  try {
    pkg = JSON.parse(event.body)
  } catch (error) {
    return context.succeed({
      success: false,
      error
    })
  }

  const storage = new Storage()

  const github = new GitHubApi()
  github.authenticate({
    type: 'oauth',
    token: pkg.githubToken
  })

  return getCurrentUser(github).then(function (user) {
    return checkIfCollaborator(github, {
      owner: pkg.repo.split('/')[0],
      repo: pkg.repo.split('/')[1],
      username: user.login
    })
  }).then(function () {
    return storage.findOne(name)
  }).then(function (data) {
    var action = 'create'
    if (data) {
      action = 'update'
      if (data.repo !== pkg.repo) {
        return context.succeed({
          success: false,
          error: new Error('A plugin with the same name has already been published.')
        })
      }
      if (data.versions && data.versions.some(v => semver.gte(v.tag, pkg.tag))) {
        return context.succeed({
          success: false,
          error: new Error('A version with a higher tag was already published.')
        })
      }
    }

    const versions = (data || {}).versions || []
    versions.push({
      tag: pkg.tag,
      url: pkg.url,
      publishedAt: new Date()
    })

    return storage[action](name, {
      name,
      repo: pkg.repo,
      keywords: pkg.keywords,
      description: pkg.description,
      versions,
      lastPublishedAt: new Date()
    })
  })
  .then(function () {
    return context.succeed({
      success: true
    })
  })
  .catch(function (error) {
    console.log(error)
    return context.succeed({
      success: false,
      error: error.message || error
    })
  })
}
