const GitHubApi = require('github')
const storage = require('./_storage')()

module.exports.handler = function (event, context, callback) {
  const github = new GitHubApi()
  try {
    github.authenticate({
      type: 'oauth',
      token: process.env.GITHUB_AUTH_TOKEN
    })
  } catch (error) {
		console.error(error)
    callback(new Error('[401] Not authenticated.'))
    return
  }

  function getContent (data) {
    return new Promise(function (resolve, reject) {
      github.repos.getContent(data, function (err, res) {
        if (err) {
          return reject(err)
        }
        resolve(res)
      })
    })
  }

  function storePlugin (plugin, downloadURL) {
    return storage.create(plugin.name, {
      name: plugin.name,
      repo: plugin.owner + '/' + plugin.name,
      description: plugin.description,
      keywords: [],
      legacy: true,
      versions: [{
        legacy: true,
        url: downloadURL,
        tag: 'v0.0.0'
      }]
    })
  }

  return getContent({
    user: 'sketchplugins',
    repo: 'plugin-directory',
    path: 'plugins.json'
  }).then(function (res) {
    return new Buffer(res.content, 'base64').toString('utf-8')
  }).then(function (res) {
    return JSON.parse(res)
  }).then(function (plugins) {
    return plugins.reduce(function (p, plugin) {
			if (!plugin.name) {
				return p
			}
      return p.then(function () {
        return storage.findOne(plugin.name)
      }).then(function (data) {
        if (data) { return }
        if (plugin.downloadURL) {
          return storePlugin(plugin, plugin.downloadURL)
        }
        return storePlugin(
          plugin,
          'https://api.github.com/repos/' + plugin.owner + '/' + plugin.name + '/zipball'
        )
      })
    }, Promise.resolve())
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
