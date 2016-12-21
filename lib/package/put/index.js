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
    return storage.get(name)
  }).then(function (data) {
    if (data) {
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
      url: pkg.url
    })

    return storage.put(name, {
      name,
      repo: pkg.repo,
      description: pkg.description,
      versions
    })
  })
  .then(function () {
    return context.succeed({
      success: true
    })
  })
  .catch(function (error) {
    return context.succeed({
      success: false,
      error
    })
  })
}
