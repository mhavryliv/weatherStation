const WebSocket = require('ws');
var https = require('https');
var express = require('express');
// var wss = express();
var fs = require('fs');


var privateKey  = fs.readFileSync('/home/ubuntu/sslCerts/privkey.pem', 'utf8');
var certificate = fs.readFileSync('/home/ubuntu/sslCerts/cert.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};

// httpsServer = https.createServer(credentials, wss);
// httpsServer.listen(443);


const wss = new WebSocket.Server({ port: 8123 });

let weatherStation;

let clients = [];

wss.on('connection', function connection(ws) {
  // Add it to the clients
  clients.push(ws);
  ws.on('message', function incoming(dataStr) {
    // Is this from the weather station? If so make sure we've got the ref
    const data = JSON.parse(dataStr);
    if(data.isWS) {
      if(weatherStation !== ws) {
        console.log("Got a weather station!");
        weatherStation = ws;
        // And remove it from clients
        let wsInClients = clients.indexOf(ws);
        if(wsInClients !== -1) {
          clients.splice(wsInClients, 1);
        }
      }
    }
    else {
      // Do nothing if it's not from the weather station
      return;
    }
    // Broadcast message to all clients
    console.log(data);
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(dataStr);
      }
    });
  });
});