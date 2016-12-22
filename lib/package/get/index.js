const Storage = require('../storage')

module.exports.handler = function (event, context) {
  const name = decodeURIComponent(event.name)

  const storage = new Storage()

  return storage.get(name)
  .then(function (plugin) {
    return context.succeed({
      success: true,
      item: plugin
    })
  })
  .catch(function (error) {
    return context.succeed({
      success: false,
      error
    })
  })
}
