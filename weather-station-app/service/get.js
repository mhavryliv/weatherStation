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
    await mdb.checkConn();
    const events = mdb.db().collection(mdb.eventCollection);
    let all = await events.find().toArray();
    return Promise.resolve(all);
  }
  catch(e) {
    return Promise.reject(e);
  }
}
module.exports.getAllEvents = getAllEvents;

module.exports.get = async (event, context, callback) => {
  const data = JSON.parse(event.body);
  let response = {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' }
  };
  try {
    let retData = {};
    if(data.getAll) {
      retData = await getAllEvents();
      response.body = JSON.stringify(retData);
    }
    else {
      response.body = JSON.stringify({
        'err': "No date range specified"
      })
    }
  }
  catch(e) {
    response.statusCode = 400;
    response.body = JSON.stringify({
      'err': e.message
    })
  }
  callback(null, response);
};
