const AWS = require('aws-sdk')
const elasticsearch = require('./elasticsearch')

function mapToES (data) {
  return {
    name: data.name,
    description: data.description,
    lastPublishedAt: data.lastPublishedAt,
    repo: data.repo,
    lastVersion: data.versions[data.versions.length - 1].tag,
    keywords: data.keywords
  }
}

module.exports = function Storage () {
  const db = new AWS.DynamoDB.DocumentClient()

  return {
    find: function (query) {
      return elasticsearch('GET', '_search?q=' + encodeURIComponent(query), {})
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
      return Promise.all([
        db.put({
          TableName: process.env.TABLE_NAME,
          Item: data
        }).promise(),
        elasticsearch('POST', encodeURIComponent(name) + '/_update?pretty', {
          doc: mapToES(data)
        })
      ])
    },

    create: function (name, data) {
      return Promise.all([
        db.put({
          TableName: process.env.TABLE_NAME,
          Item: data
        }).promise(),
        elasticsearch('PUT', encodeURIComponent(name) + '?pretty', mapToES(data))
      ])
    }
  }
}
