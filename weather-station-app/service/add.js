'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

function isValidData(data) {
  if(!data.info || data.info.indexOf("Weather station data") === -1) {
    return false;
  }
  return true;
}
module.exports.isValidData = isValidData;

function containsAllItems(data) {
  const allDataKeys = Object.keys(data);
  let missingKeys = [];
  // Check key data
  const dataRequired = ["interval", "num_data_points", "water_mm",
                        "wind_speed", "wind_dir", "max_gust", "temperature", 
                        "humidity", "pressure"];
  dataRequired.forEach(requiredKey => {
    if(allDataKeys.indexOf(requiredKey) === -1) {
      missingKeys.push(requiredKey);
    }
  })
  if(missingKeys.length != 0) {
    return {
      'missing_keys': missingKeys
    }
  }

  const numDataPoints = data.num_data_points;

  // Check all arrays have the right amount of elements
  const arrayKeys = 
  ["water_mm", "wind_speed", "wind_dir", "max_gust", "temperature", "humidity", "pressure"];
  
  let missingData = [];

  arrayKeys.forEach(arrayKey => {
    if(!data[arrayKey].isArray() || data[arrayKey].length !== numDataPoints) {
      missingData.push(k);
    }
  })
  if(missingData.length !== 0) {
    return {
      'missing_data': missingData
    }
  }

  return {
    'has_all_data': true
  };
}
module.exports.containsAllItems = containsAllItems


module.exports.add = (event, context, callback) => {
  const data = event.body;
  if(!isValidData(data)) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: "Not recognised weather event",
    });
    return;
  }

  if(!containsAllItems(data)) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: "Data doesn't contain all expected items",
    });
    return;
  }

  const timestamp = new Date().getTime();

  const keys = 
  ["water_mm", "wind_speed", "wind_dir", "max_gust", "temperature", "humidity", "pressure"];

  let dataToStore;
  const numDataPoints = data.num_data_points;
  let obj = {};
  obj["date"] = timestamp;
  obj["id"] = uuid.v1();
  obj[keys[0]] = data[keys[0]][0];
  obj[keys[1]] = data[keys[1]][0];
  obj[keys[2]] = data[keys[2]][0];
  obj[keys[3]] = data[keys[3]][0];
  obj[keys[4]] = data[keys[4]][0];
  obj[keys[5]] = data[keys[5]][0];
  obj[keys[6]] = data[keys[6]][0];


  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      obj
    }
  };

  // write the todo to the database
  dynamoDb.put(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t create the todo item.',
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(params.Item),
    };
    callback(null, response);
  });
};
