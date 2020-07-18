var express = require('express');
var app = express();
var bodyParser = require('body-parser')

// app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.post('/wind_and_water', (req, res) => {
  const data = req.body;
  console.log(Date.now());
  console.log(data);
  const samplingInterval = data.interval;
  const speedArr = data.wind_speed;
  const gustArr = data.max_gust;
  const dirArr = data.wind_dir;
  
  console.log("Wind speed: " + speedArr);
  console.log("Gusts: " + gustArr);
  console.log("Direction: "+ dirArr);
  res.send("ok");
})

app.listen(9876, () => {
  console.log("Listening on port 9876");
})