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

async function getLastEvent() {
  try {
    await mdb.checkConn();
    const events = mdb.db().collection(mdb.eventCollection);
    let lastEvent = await events.find().limit(1).sort({$natural:-1}).toArray();
    return Promise.resolve(lastEvent[0]);
  }
  catch(e) {
    return Promise.reject(e)
  }
}
module.exports.getLastEvent = getLastEvent;

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

async function getEventsForLastSeconds(numSecondsBack) {
  // Get the current time
  const curTime = Date.now();
  const startTime = curTime - (numSecondsBack * 1000);
  try {
    let events = await getEventsInTimeRange(startTime);
    return Promise.resolve(events);
  }
  catch(e) {
    return Promise.reject(e);
  }
}

module.exports.get = async (event, context) => {
  console.log("Got request: ");
  console.log(event.body);
  let data;
  // if there is no body, just return last 24 hours
  if(event.body === null) {
    console.log("No body in post request so just setting to return last 24 hours data");
    data = {"getPastSeconds": 86400}
  }
  else {
    data = JSON.parse(event.body);
  }
  
  let response = {
    statusCode: 200,
    headers: { 
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json' }
  };
  try {
    let retEvents;
    if(data.getAll) {
      retEvents = await getAllEvents();
    }
    else if(data.getCurrent) {
      retEvents = [await getLastEvent()];
    }
    else if(data.getPastSeconds) {
      retEvents = await getEventsForLastSeconds(data.getPastSeconds);
    }
    else if(data.startRange) {
      retEvents = await getEventsInTimeRange(data.startRange, data.endRange);
    }
    else {
      retEvents = {
        "err": "Don't know what data to return"
      }
    }

    // If the data doesn't want wind clicks, remove it
    if(!data.windClicks) {
      for(var i = 0; i < retEvents.length; ++i) {
        retEvents[i].wind_clicks = undefined;
      }
    }
    response.body = JSON.stringify({
      count: retEvents.length,
      events: retEvents
    });
  }
  catch(e) {
    response.statusCode = 400;
    response.body = JSON.stringify({
      'err': e.message
    })
  }
  return response;
};
