'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.add = (event, context, callback) => {
  const timestamp = new Date().getTime();
  console.log("Event");
  console.log(event);
  let data = event.body;
  if(!data.info || data.info.indexOf("Weather station data") === -1) {
    console.error("Validation Failed, no 'Weather station data' string");
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: "Not authorised weather event",
    });
    return;
  }

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
