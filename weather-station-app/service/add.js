'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

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
      'has_all_data': false
    };
  }
  let allDataKeys = Object.keys(data);
  let missingKeys = [];
  // Check key data
  let dataRequired = ["interval", "num_data_points", "water_mm",
                        "wind_speed", "wind_dir", "max_gust", "temperature", 
                        "humidity", "pressure", "info", "wind_click_times"];
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

  const numDataPoints = data.num_data_points;

  // Check all arrays have the right amount of elements
  const arrayKeys = 
  ["wind_speed", "wind_dir", "max_gust"];
  
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

function convertDataToArrays() {

}

module.exports.add = (event, context, callback) => {
  const data = event.body;
  const dataCheck = isValidData(data);

  if(!dataCheck.has_all_data) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataCheck)
    });
    return;
  }

  callback(null, {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({"success": true})
  })

  return;

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
