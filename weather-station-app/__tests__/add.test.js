const addHandler = require('../service/add');
const badData = require('./badData.json');
const goodDataPath = __dirname + "/goodData.json";

var fs = require('fs');
var express = require('express');
var app = express();
var bodyParser = require('body-parser')
app.use(bodyParser.json())

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const IS_OFFLINE = process.env.IS_OFFLINE;

// Setup the dynamodb ref for local testing
let dynamoDb;
dynamoDb = new AWS.DynamoDB.DocumentClient({
  region: 'localhost',
  endpoint: 'http://localhost:8000',
});

// Set the timeout to 10 sec to wait for post data from weather station
jest.setTimeout(10000);

// This calls back with good data either from disk or after receviing from arduino
 let getGoodData = new Promise(function(resolve, reject) {
  if(!fs.existsSync(goodDataPath)) {
      app.post('/weather_data_up', (req, res) => {
        const data = {"body": req.body};
        fs.writeFileSync(goodDataPath, JSON.stringify(data, null, 2));
        res.send("ok");
        server.close();
        resolve(data);
      })

      let server = app.listen(9876, () => {
        console.log("Listening for real data on port 9876");
      })
    }
    else {
      resolve(require('./goodData.json'));
    }
 })

// Global good data is set after first call to getGoodData()
let goodData = undefined;
test('Data validation', async done => {
  goodData = await getGoodData;
  expect(addHandler.isValidData(goodData)).toHaveProperty("has_all_data");
  expect(addHandler.isValidData(badData.wrong_info)).toHaveProperty("has_all_data", false);
  expect(addHandler.isValidData(badData.missing_keys)).toHaveProperty("missing_keys");
  expect(addHandler.isValidData(badData.missing_data)).toHaveProperty("missing_data");
  
  done();
})

// Will be executed after done() is called in the first test
test('Data conversion test', () => {
  // Extract the actual data out of the original goodData http req
  const originalData = goodData.body;
  // Get the array data
  const arrData = addHandler.convertDataToArrays(originalData);
  // Prepare a few bits of data to test
  const numItems = originalData.num_data_points;
  // Makes sure it's the correct array size
  expect(arrData.length).toBe(numItems);
  // Make sure the times are right
  const firstTime = arrData[0].time;
  for(var i = 1; i < numItems; ++i) {
    expect(arrData[i].time).toBe(firstTime + (i * originalData.interval));
  }
  // Go randomly through entries
  // Build an array of fields that are arrays in the original data
  let arrFields = [];
  // And those that are single values
  let singletonFields = [];
  // Ignore these fields because they won't exist in the outcome
  const ignoreFields = ["interval", "num_data_points", "info", "wind_clicks"];
  const allOriginalFields = Object.keys(originalData);
  for(var i = 0; i < allOriginalFields.length; ++i) {
    const fieldKey = allOriginalFields[i];
    if(ignoreFields.indexOf(fieldKey) !== -1) {
      continue;
    }
    if(Array.isArray(originalData[fieldKey])) {
      arrFields.push(fieldKey);
    }
    else {
      if(fieldKey)
      singletonFields.push(fieldKey);
    }
  }
  const numToTest = 1000;
  // Check data by randomly choosing an item and comparing it to the value in the original array
  for(var i = 0; i < numToTest; ++i) {
    const itemIndex = rand(numItems);
    const testData = arrData[itemIndex];
    const testSingleton = rand(2);
    if(testSingleton) {
      const singletonField = singletonFields[rand(singletonFields.length)];
      const compareValue = originalData[singletonField];
      const testValue = testData[singletonField];
      expect(testValue).toBe(compareValue);
    }
    else {
      const arrField = arrFields[rand(arrFields.length)];
      const compareValue = originalData[arrField][itemIndex];
      const testValue = testData[arrField];
      expect(testValue).toBe(compareValue);
    }
  }
  // Treat wind times separately.
  if(originalData.wind_clicks.length !== 0) {
    const originalClicks = originalData.wind_clicks;
    console.log(originalClicks);
    const startTime = arrData[0].time;
    const interval = originalData.interval;
    for(var i = 0; i < originalClicks.length; ++i) {
      let compareValue = originalClicks[i];
      const testItemIndex = Math.floor(compareValue / interval);
      // Adjust the comparevalue to account for the start time
      compareValue -= (testItemIndex*interval);
      // console.log("Looking for index: " + testItemIndex);
      // console.log(arrData[testItemIndex]);

      expect(arrData[testItemIndex].wind_clicks.indexOf(compareValue)).not.toBe(-1);
    }
  }

})

test('Data write test', () => {
  // Extract the actual data out of the original goodData http req
  const originalData = goodData.body;
  // Get the array data
  const arrData = addHandler.convertDataToArrays(originalData);

  addHandler.writeDataToDb(arrData, dynamoDb, "weather-station-service-dev", (err) => {
    expect(err).toBeNull();
  })
})





function rand(max) {
  return Math.floor(Math.random() * max);
}