const GitHubApi = require('github')
const Storage = require('../storage')

module.exports.handler = function (event, context) {
  const github = new GitHubApi()
  github.authenticate({
    type: 'oauth',
    token: process.env.GITHUB_AUTH_TOKEN
  })
  const storage = new Storage()

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
    return storage.put(plugin.name, {
      name: plugin.name,
      repo: plugin.owner + '/' + plugin.name,
      description: plugin.description,
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
    return Promise.all(plugins.map(function (plugin) {
      return storage.get(plugin.name).then(function (data) {
        if (data) { return }
        if (plugin.downloadURL) {
          return storePlugin(plugin, plugin.downloadURL)
        }
        return getContent({
          user: plugin.owner,
          repo: plugin.name,
          path: ''
        }).then(function (files) {
          const file = (files || []).filter(function (file) {
            return /\.sketchplugin$/.test(file.name)
          })[0]
          if (!file) { return }
          return storePlugin(plugin, file.download_url)
        }).catch(function (err) {
          console.log(err.message)
          console.log({
            user: plugin.owner,
            repo: plugin.name
          })
        })
      })
    }))
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
