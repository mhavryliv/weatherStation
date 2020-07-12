var express = require('express');
var app = express();
var bodyParser = require('body-parser')

app.use(bodyParser.json())

app.post('/wind_speed', (req, res) => {
  const data = req.body;
  console.log(data);
  res.json({"ok": true});
})

app.listen(9876, () => {
  console.log("Listening on port 9876");
})