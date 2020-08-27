'use strict';
const uuid = require('uuid');
const mdb = require('./mclient.js');
const middy = require('middy');
const { cors } = require('middy/middlewares');
// for testing, expose the mdb
module.exports.mdb = mdb;

function isValidData(data) {
  if(!data) {
    return {
      'has_all_data': false,
      'data_undefined': true
    }
  }
  if(!data.info || data.info.indexOf("Weather station data") === -1) {
    return {
      'missing_id': true,
      'has_all_data': false,
      'data': data
    };
  }
  let allDataKeys = Object.keys(data);
  let missingKeys = [];
  // Check key data
  let dataRequired = ["interval", "num_data_points", "water_mm",
                        "wind_speed", "wind_dir", "max_gust", "temperature", 
                        "humidity", "pressure", "info"];
  // Quick check they are the same
  if(JSON.stringify(allDataKeys.sort()) !== JSON.stringify(dataRequired.sort())) {
    dataRequired.forEach(requiredKey => {
      if(allDataKeys.indexOf(requiredKey) === -1) {
        missingKeys.push(requiredKey);
      }
    })
    return {
      'key_mismatch': true,
      'missing_keys': missingKeys,
      'has_all_data': false,
    }
  }

  // Check all arrays have the right amount of elements
  const numDataPoints = data.num_data_points;
  // Keys with array values
  const arrayKeys = ["wind_speed", "wind_dir", "max_gust"];
  
  let missingData = [];

  arrayKeys.forEach(arrayKey => {
    if(!data[arrayKey] || data[arrayKey].length !== numDataPoints) {
      missingData.push(arrayKey);
    }
  })
  if(missingData.length !== 0) {
    return {
      'missing_data': missingData,
      'has_all_data': false
    }
  }

  return {
    'has_all_data': true
  };
}
module.exports.isValidData = isValidData;

function getAverage(data) {
  let ret = 0;
  for(var i = 0; i < data.length; ++i) {
    ret += data[i];
  }
  ret /= data.length;
  return ret;
}

const round = (number, decimalPlaces) => {
  const factorOfTen = Math.pow(10, decimalPlaces)
  return Math.round(number * factorOfTen) / factorOfTen
}

function convertDataToDBItem(data) {
  // Fields to pull out
  const aggregrateDbFields = ["water_mm", "temperature", "humidity", "pressure"];
  const fieldsToRound = ["temperature", "humidity", "pressure", "wind_speed", "max_gust"];
  const arrayDbFields = [ "wind_speed", "wind_dir", "max_gust"];
  // Number of data points in this data set
  const numItems = data.num_data_points;
  // Sampling interval in msec
  const samplingInterval = data.interval;
  // Total time for this set of data
  const totalTime = numItems * samplingInterval;
  const startTime = Date.now();
  let item = {
    time: startTime,
    interval: samplingInterval,
    num_wind_data_points: numItems
  };
  // Loop through the items that are single values
  for(var i = 0; i < aggregrateDbFields.length; ++i) {
    const field = aggregrateDbFields[i];
    item[field] = data[field];
    if(fieldsToRound.indexOf(field) !== -1) {
      item[field] = round(item[field], 2);
    }
  }
  // Loop through the arrays and write them
  for(var i = 0; i < arrayDbFields.length; ++i) {
    const field = arrayDbFields[i];
    item[field] = data[field];
  }

  for(var i = 0; i < fieldsToRound.length; ++i) {
    const field = fieldsToRound[i];
    if(field === "wind_speed" || field === "max_gust") {
      let speeds = item[field];
      for(var j = 0; j < speeds.length; ++j) {
        speeds[j] = round(speeds[j], 2);
      }
    }
    else {
      item[field] = round(item[field], 2);
    }
  }

  return item;
}
module.exports.convertDataToDBItem = convertDataToDBItem;

// Converts data in the Arduino format into array format for entry into our DB
function convertDataToArrays(data) {
  // Fields to pull out
  const aggregrateDbFields = ["water_mm", "temperature", "humidity", "pressure"];
  const arrayDbFields = [ "wind_speed", "wind_dir", "max_gust"];
  // Number of data points in this data set
  const numItems = data.num_data_points;
  // Sampling interval in msec
  const samplingInterval = data.interval;
  let items = [];
  const startTime = Date.now();
  // Loop through the number of items we're going to build
  for(var i = 0; i < numItems; ++i) {
    const itemTimeOffset = i*samplingInterval;
    let item = {
      "time": startTime + itemTimeOffset,
      "wind_clicks": []
    }
    // Loop through and assign the values that are common across all items
    for(var j = 0; j < aggregrateDbFields.length; ++j) {
      const field = aggregrateDbFields[j];
      item[field] = data[field];
    }
    // Loop through the array values, assigning the appropriate one
    for(var j = 0; j < arrayDbFields.length; ++j) {
      const field = arrayDbFields[j];
      // Handle wind clicks differently
      if(field === "wind_clicks") {
        const dataWindClicks = data[field];
        // Loop through wind clicks and pick out those in range of this item
        for(var k = 0; k < dataWindClicks.length; ++k) {
          const wclickTime = dataWindClicks[k];
          if((wclickTime >= itemTimeOffset) 
            && (wclickTime < (itemTimeOffset+samplingInterval))) {
            // Subtract this item's start time from the windclick time so they are all recorded as 
            // a msec offset from the item's time
            item[field].push(wclickTime - itemTimeOffset);
          }
        }
      }
      // If not wind click, simply assign it to the item
      else {
        item[field] = data[field][i];
      } 
    }
    // Add it to the items array
    items.push(item);
  }

  return items;
}
module.exports.convertDataToArrays = convertDataToArrays;

async function writeDataToDb(dataArr) {
  try {
    await mdb.checkConn();
    const events = mdb.db().collection(mdb.eventCollection);
    await events.insertMany(dataArr);
    return Promise.resolve();
  }
  catch(e) {
    console.log("Error writing to db: " + e);
    return Promise.reject(e);
  }
}
module.exports.writeDataToDb = writeDataToDb;

async function writeSingleItemToDb(item) {
  try {
    await mdb.checkConn();
    const events = mdb.db().collection(mdb.eventCollection);
    const result = await events.insertOne(item);
    return Promise.resolve(result.insertedId);
  }
  catch(e) {
    console.log("Error writing to db: " + e);
    return Promise.reject(e);
  }
}
module.exports.writeSingleItemToDb = writeSingleItemToDb;

module.exports.add = async (event, context) => {
  const data = JSON.parse(event.body);
  const dataCheck = isValidData(data);

  if(!dataCheck.has_all_data) {
    const response = {
      statusCode: 400,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json' },
      body: JSON.stringify(dataCheck)
    }
    return response;
  }

  const dataItem = convertDataToDBItem(data);
  
  try {
    const insertedId = await writeSingleItemToDb(dataItem);
  }
  catch(error) {
    console.error(error);
    return {
      statusCode: error.statusCode || 501,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json' },
      body: 'Could not write the weather data.',
    };
  }

  // create a response
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      'success': true
    })
  };
  return response;
};
