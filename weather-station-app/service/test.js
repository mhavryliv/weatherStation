const MongoClient = require('mongodb').MongoClient;
const mongoUser = "mark";
const mongoDbName = "weather-service";
const mongoPass = "unisux";
const mongoConnStr = "mongodb+srv://" + mongoUser + ":" + mongoPass
                   +  "@cluster0.wyaba.mongodb.net/" + mongoDbName + "?retryWrites=true&w=majority"

const localMongoConnStr = "mongodb://localhost:27017" + mongoDbName;


const client = new MongoClient(localMongoConnStr, {
  useNewUrlParser: true
});
let db;

const createConn = async () => {
    await client.connect();
    db = client.db(mongoDbName);
};

const checkConn = async () => {
  if (!client.isConnected()) {
      // Cold start or connection timed out. Create new connection.
      try {
          await createConn();
          return Promise.resolve();
      } catch (e) {
        return Promise.reject();
      }
  }
}

const addItem = async () => {
  const names = db.collection('events');
  const newName = {
    time: Date.now(),
    name: 'foobar'
  }
  return {
    insertedName: newName,
    mongoResult: await names.insertOne(newName)
  }
}

const doIt = async () => {
  try {
    await checkConn();
    let res = await addItem();
    console.log("insert ok? " + res.mongoResult.result.ok);
  }
  catch(e) {
    console.log("Error: " + e);
  }
}


doIt();
