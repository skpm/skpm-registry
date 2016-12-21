const AWS = require('aws-sdk')

module.exports = function Storage () {
  const db = new AWS.DynamoDB.DocumentClient()

  return {
    get: function (name) {
      return db.get({
        TableName: 'plugins',
        Key: {
          name: name
        }
      }).promise().then(function (meta) {
        return meta.Item
      })
    },

    put: function (name, data) {
      return db.put({
        TableName: 'plugins',
        Item: data
      }).promise()
    }
  }
}
