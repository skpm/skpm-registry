const AWS = require('aws-sdk')
const path = require('path')

/*
 * The AWS credentials are picked up from the environment.
 * They belong to the IAM role assigned to the Lambda function.
 * Since the ES requests are signed using these credentials,
 * make sure to apply a policy that allows ES domain operations
 * to the role.
 */
const creds = new AWS.EnvironmentCredentials('AWS')
function signRequest (req) {
  const signer = new AWS.Signers.V4(req, 'es')  // es: service code
  console.log(signer)
  console.log(creds)
  signer.addAuthorization(creds, new Date())
}

const es = new AWS.ES()

var endpoint // cache the elasticsearch endpoint

function getRequest () {
  var p
  if (endpoint) {
    p = Promise.resolve(endpoint)
  } else {
    p = es.describeElasticsearchDomains({
      DomainNames: [process.env.DOMAIN_NAME]
    }).promise().then(function (domains) {
      if (!domains || !domains.DomainStatusList || !domains.DomainStatusList[0]) {
        console.log(domains)
        throw new Error('Elasticsearch domain not found')
      }
      endpoint = new AWS.Endpoint(domains.DomainStatusList[0].Endpoint)
      return endpoint
    })
  }

  return p.then(function (endpoint) {
    const req = new AWS.HttpRequest(endpoint)
    req.path = path.join('/', 'name', 'plugin')
    req.region = process.env.AWS_REGION
    req.headers['presigned-expires'] = false
    req.headers['Host'] = endpoint.host
    req.headers['Content-Type'] = 'application/x-www-form-urlencoded'

    return req
  })
}

module.exports = function (_method, _path, _doc) {
  return getRequest().then(function (req) {
    return new Promise(function (resolve, reject) {
      req.method = _method
      req.path = path.join('/', 'name', 'plugin', _path)
      req.body = JSON.stringify(_doc)

      // signRequest(req)

      var send = new AWS.NodeHttpClient()
      send.handleRequest(req, null, function (httpResp) {
        var respBody = ''
        httpResp.on('data', function (chunk) {
          respBody += chunk
        })
        httpResp.on('end', function () {
          const res = JSON.parse(respBody)
          if (res.message || res.error) {
            reject(res)
          } else {
            resolve(res)
          }
        })
      }, function (err) {
        reject(err)
      })
    })
  })
}
