const storage = require('./_storage')()

module.exports.handler = function (event, context, callback) {
  const q = decodeURIComponent(event.q)

  return storage.find(q)
  .then(function (plugins) {
		callback(null, {
			items: plugins.Items
		})
    return
  })
  .catch(function (error) {
    console.log(error)
		callback(error)
    return
  })
}
