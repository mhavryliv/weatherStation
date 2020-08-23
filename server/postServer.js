var express = require('express');
var app = express();
var bodyParser = require('body-parser')

// app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.post('/add', (req, res) => {
  const data = req.body;
  const timestamp = Date.now();
  const samplingInterval = data.interval;
  const speedArr = data.wind_speed;
  const gustArr = data.max_gust;
  const dirArr = data.wind_dir;
  const waterMm = data.water_mm;
  const windClickTimes = data.wind_click_times;
  const temperatureArr = data.temperature;
  const humidityArr = data.humidity;
  const pressureArr = data.pressure;

  console.log(new Date());
  console.log(data);
  // console.log(JSON.stringify(data));
  
  // console.log("Wind speed: " + speedArr);
  // console.log("Wind click times: " + windClickTimes);
  // console.log("Gusts: " + gustArr);
  // console.log("Direction: "+ dirArr);
  // console.log("Rain (mm) " + waterMm);
  // console.log("Temperature " + temperatureArr);
  // console.log("Humidity " + humidityArr);
  // console.log("Pressure " + pressureArr);
  res.send("ok");
})

app.listen(9876, () => {
  console.log("Listening on port 9876");
})