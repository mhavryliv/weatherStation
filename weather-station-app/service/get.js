'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const mdb = require('./mclient.js');
// for testing, expose the mdb
module.exports.mdb = mdb;

async function getEventWithTime(time) {
  try {
    await mdb.checkConn();
    const events = mdb.db().collection(mdb.eventCollection);
    const theEvent = await events.findOne({time: time})
    return Promise.resolve(theEvent);
  }
  catch(e) {
    return Promise.reject(e);
  }
}
module.exports.getEventWithTime = getEventWithTime;

async function getAllEvents() {
  try {
    let all = await mdb.db().collection(mdb.eventCollection).find().toArray();
    return Promise.resolve(all);
  }
  catch(e) {
    return Promise.reject(e);
  }
}
module.exports.getAllEvents = getAllEvents;

module.exports.get = (event, context, callback) => {
  // create a response
  const response = {
    statusCode: 200,
    body: JSON.stringify(result.Item),
  };
  callback(null, response);
};
