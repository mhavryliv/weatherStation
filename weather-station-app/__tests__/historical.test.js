// const getHandler = require('../service/get');
const sortHandler = require('../service/sorting.js');
const dataPath = __dirname + "/data.json";
var fs = require('fs');

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const IS_OFFLINE = process.env.IS_OFFLINE;

// async function getAllData() {
//   const timeRangeBack = (3600 * 24.5); // get the last 24 hours plus extra half hour
//   let allData = await getHandler.getEventsForLastSeconds(timeRangeBack);
//   console.log(allData.length);
//   fs.writeFileSync(dataPath, JSON.stringify(allData, null, 2));
// }

// getAllData();

const data = JSON.parse(fs.readFileSync(dataPath));
const shortData = data.slice(-50);

async function getHalfHourly() {
  let index = sortHandler.getMostRecentHalfHourIndex(shortData);
}

getHalfHourly();