var IS_OFFLINE = (process.env.IS_OFFLINE === '1') || (process.env.IS_OFFLINE === 'true');
const MongoClient = require('mongodb').MongoClient;
const mongoUser = "mark";
const mongoDbName = "weather-service";
const eventCollection = "events";
const mongoPass = "unisux";
let mongoConnStr;

if(IS_OFFLINE) {
  mongoConnStr = "mongodb://localhost:27017/" + mongoDbName;
}
else {
  mongoConnStr = "mongodb+srv://" + mongoUser + ":" + mongoPass
               +  "@cluster0.wyaba.mongodb.net/" + mongoDbName + "?retryWrites=true&w=majority";
}

console.log("Connecting to: " + mongoConnStr);

const client = new MongoClient(mongoConnStr, {
  useNewUrlParser: true
});
let db;

const createConn = async () => {
  await client.connect();
  db = await client.db(mongoDbName);
  return Promise.resolve();
};

const checkConn = async () => {
  if (!client.isConnected()) {
    // Cold start or connection timed out. Create new connection.
    try {
        await createConn();
    } catch (e) {
      return Promise.reject();
    }
  }
  return Promise.resolve();
}

module.exports.closeConn = function()  {
  if(client.isConnected()) {
    client.close();
  }
}

module.exports.db = function() {
  return db;
}

module.exports.client = client;
module.exports.checkConn = checkConn;
module.exports.eventCollection = eventCollection;
