const storage = require('./_storage')()

module.exports.handler = function (event, context, callback) {
  const name = decodeURIComponent(event.name)

  return storage.findOne(name)
  .then(function (plugin) {
    return callback(null, {
      success: true,
      item: plugin
    })
  })
  .catch(function (error) {
    console.log(error)
		callback(error)
    return
  })
}
