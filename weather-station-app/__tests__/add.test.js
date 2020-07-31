const addHandler = require('../service/add');
const badData = require('./badData.json');
const goodDataPath = __dirname + "/goodData.json";

var fs = require('fs');
var express = require('express');
var app = express();
var bodyParser = require('body-parser')
app.use(bodyParser.json())

// Set the timeout to 10 sec to wait for post data from weather station
jest.setTimeout(10000);

// This calls back with good data either from disk or after receviing from arduino
 function getGoodData() {
  if(!fs.existsSync(goodDataPath)) {
    app.post('/weather_data_up', (req, res) => {
      const data = {"body": req.body};
      fs.writeFileSync(goodDataPath, JSON.stringify(data, null, 2));
      res.send("ok");
      server.close();
      return data;
    })

    let server = app.listen(9876, () => {
      console.log("Listening for real data on port 9876");
    })
  }
  else {
    return require('./goodData.json');
  }
}

// Global good data is set after first call to getGoodData()
let goodData = undefined;
test('Data validation', async done => {
  goodData = await getGoodData();
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
  const allOriginalFields = Object.keys(originalData);
  for(var i = 0; i < allOriginalFields.length; ++i) {
    const fieldKey = allOriginalFields[i];
    if(Array.isArray(originalData[fieldKey])) {
      arrFields.push(fieldKey);
    }
  }
  console.log(arrFields);
  const numToTest = 500;
  // Check data
  // Check wind click times!!!
  // for(var i = 0; i < numToTest; ++i) {
  //   const itemIndex = rand(numItems);
  //   const testData = arrData[itemIndex];

  // }

})






function rand(max) {
  return Math.floor(Math.random() * Math.floor(max));
}