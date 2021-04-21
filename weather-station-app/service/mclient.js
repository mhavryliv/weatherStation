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

  // mongoConnStr = "mongodb://" + mongoUser + ":" + mongoPass + 
  // "@cluster0-shard-00-00.wyaba.mongodb.net:27017,cluster0-shard-00-01.wyaba.mongodb.net:27017,cluster0-shard-00-02.wyaba.mongodb.net:27017/"
  // + mongoDbName + "?ssl=true&replicaSet=atlas-z7hlz2-shard-0&authSource=admin&retryWrites=true&w=majority";
                 
}

console.log("[MClient] Loading - using database URL: " + mongoConnStr);

const client = new MongoClient(mongoConnStr, {
  useNewUrlParser: true,
  useUnifiedTopology: true
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
    console.log("[MClient] Creating a new connection");
    try {
        await createConn();
    } catch (e) {
      return Promise.reject();
    }
  }
  else {
    console.log("[MClient] Using existing client connection");
  }
  return Promise.resolve();
}

module.exports.closeConn = function()  {
  console.log("[MClient] Closing connection")
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
