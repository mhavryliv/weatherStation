var express = require('express');
var app = express();
var bodyParser = require('body-parser')

app.use(bodyParser.json())

app.get('/wind_speed', (req, res) => {
  const speed = req.query.speed;
  console.log("Wind speed: " + speed);
  res.send("Wind speed "  + speed + " received");
})

app.listen(9876, () => {
  console.log("Listening on port 9876");
})