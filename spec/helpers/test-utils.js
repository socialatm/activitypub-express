const { MongoClient } = require('mongodb')
const express = require('express')
const ActivitypubExpress = require('../../index')

global.initApex = async function initApex () {
  const routes = {
    actor: '/u/:actor',
    object: '/o/:id',
    activity: '/s/:id',
    inbox: '/inbox/:actor',
    outbox: '/outbox/:actor',
    followers: '/followers/:actor',
    following: '/following/:actor',
    liked: '/liked/:actor',
    shares: '/s/:id/shares',
    likes: '/s/:id/likes',
    collections: '/u/:actor/c/:id',
    blocked: '/u/:actor/blocked',
    rejections: '/u/:actor/rejections',
    rejected: '/u/:actor/rejected'
  }
  const app = express()
  const apex = ActivitypubExpress({
    domain: 'localhost',
    actorParam: 'actor',
    objectParam: 'id',
    activityParam: 'id',
    routes,
    endpoints: {
      uploadMedia: 'https://localhost/upload',
      oauthAuthorizationEndpoint: 'https://localhost/auth/authorize'
    }
  })

  app.use(express.json({ type: apex.consts.jsonldTypes }), apex)
  app.use(function (err, req, res, next) {
    console.log(err)
    next(err)
  })

  const client = new MongoClient('mongodb://localhost:27017', { useUnifiedTopology: true, useNewUrlParser: true })
  await client.connect({ useNewUrlParser: true })
  apex.store.db = client.db('apexTestingTempDb')
  const testUser = await apex.createActor('test', 'test', 'test user')

  return { app, apex, client, testUser, routes }
}

global.resetDb = async function (apex, client, testUser) {
  // reset db for each test
  await client.db('apexTestingTempDb').dropDatabase()
  apex.store.db = client.db('apexTestingTempDb')
  delete testUser._local
  await apex.store.setup(testUser)
  testUser._local = { blockList: [] }
}

// remove properties from object that may differ for each test run
global.stripIds = function (obj) {
  return JSON.parse(JSON.stringify(obj, skipTransient))
}

function skipTransient (key, value) {
  if (['_id', 'id', 'published', 'first'].includes(key)) {
    return undefined
  }
  return value
}

global.toExternalJSONLD = async function (apex, value, noContext) {
  value = JSON.parse(apex.stringifyPublicJSONLD(await apex.toJSONLD(value)))
  if (noContext) {
    delete value['@context']
  }
  return value
}
