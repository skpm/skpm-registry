const AWS = require('aws-sdk')

module.exports = function Storage () {
  const db = new AWS.DynamoDB.DocumentClient()

  return {
    find: function (query) {
      const _query = {
        TableName: process.env.TABLE_NAME,
        ProjectionExpression: '#name, description, lastPublishedAt, repo, keywords, versions',
        FilterExpression: 'contains(#name, :search) OR contains(description, :search) OR contains(repo, :search) OR contains(keywords, :search)',
        ExpressionAttributeNames: {
          '#name': 'name'
        },
        ExpressionAttributeValues: {
          ':search': query
        }
      }

      return db.scan(_query).promise().then(function (res) {
				res.Items = (res.Items || []).map(function (i) {
					i.lastVersion = i.versions[i.versions.length - 1].tag
					delete i.versions
					return i
				})
				return res
			})
    },

    findOne: function (name) {
      return db.get({
        TableName: process.env.TABLE_NAME,
        Key: {
          name: name
        }
      }).promise().then(function (meta) {
        return meta.Item
      })
    },

    update: function (name, data) {
      return db.put({
				TableName: process.env.TABLE_NAME,
				Item: data
			}).promise()
    },

    create: function (name, data) {
      return db.put({
				TableName: process.env.TABLE_NAME,
				Item: data
			}).promise()
    }
  }
}
