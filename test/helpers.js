const sinonChai = require('sinon-chai')
const sinon = require('sinon')
const chai = require('chai')
const mocks = require('./mocks')

global.stub = sinon.stub
global.spy = sinon.stub
global.expect = chai.expect
global.mocks = mocks

chai.use(sinonChai)
