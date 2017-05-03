const semver = require('semver')
const GitHubApi = require('github')
const storage = require('./_storage')()

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

module.exports.handler = function (event, context, callback) {
  const name = decodeURIComponent(event.name)
  var pkg
  try {
    pkg = JSON.parse(event.body)
  } catch (error) {
		console.error(error)
		callback('[400] Error while parsing body: ' + error.message)
    return
  }

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
				callback(new Error('[400] A plugin with the same name has already been published.'))
        return
      }
      if (data.versions && data.versions.some(v => semver.gte(v.tag, pkg.tag))) {
				callback(new Error('[400] A version with a higher tag was already published.'))
        return
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
		callback(null, {
			success: true
		})
    return
  })
  .catch(function (error) {
    console.log(error)
		callback(error)
    return
  })
}
