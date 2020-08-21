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

async function getEventsInTimeRange(startTime, endTime) {
  try {
    if(!endTime) {
      endTime = Date.now()
    }
    if(!startTime) {
      startTime = 1;
    }
    await mdb.checkConn();
    const events = mdb.db().collection(mdb.eventCollection);
    let rangeEvents = await events.find({time: {$gte: startTime, $lte: endTime}}).toArray();
    return Promise.resolve(rangeEvents);
  }
  catch(e) {
    return Promise.reject(e);
  }
}
module.exports.getEventsInTimeRange = getEventsInTimeRange;

module.exports.get = async (event, context, callback) => {
  const data = JSON.parse(event.body);
  let response = {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' }
  };
  try {
    if(data.getAll) {
      const allData = await getAllEvents();
      response.body = JSON.stringify(allData);
    }
    else if(!data.startRange){
      response.body = JSON.stringify({
        'err': "No date range specified"
      })
    }
    else {
      const rangeData = await getEventsInTimeRange(data.startRange, data.endRange);
      response.body = JSON.stringify(rangeData);
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
