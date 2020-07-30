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
function getGoodData(callback) {
  if(!fs.existsSync(goodDataPath)) {
    app.post('/weather_data_up', (req, res) => {
      const data = {"body": req.body};
      fs.writeFileSync(goodDataPath, JSON.stringify(data, null, 2));
      res.send("ok");
      server.close();
      callback(data);
    })

    let server = app.listen(9876, () => {
      console.log("Listening for real data on port 9876");
    })
  }
  else {
    callback(require('./goodData.json'));
  }
}

// Global good data is set after first call to getGoodData()
let goodData = undefined;
test('Data validation', done => {
  getGoodData(d => {
    goodData = d;
    expect(addHandler.isValidData(goodData)).toHaveProperty("has_all_data");
    expect(addHandler.isValidData(badData.wrong_info)).toHaveProperty("has_all_data", false);
    expect(addHandler.isValidData(badData.missing_keys)).toHaveProperty("missing_keys");
    expect(addHandler.isValidData(badData.missing_data)).toHaveProperty("missing_data");
    
    done();
  });
})

// Will be executed after done() is called in the first test
// test('Second test', () => {

// })