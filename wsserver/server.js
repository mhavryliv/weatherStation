const WebSocket = require('ws');

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
    // Broadcast message to all clients
    console.log(data);
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(dataStr);
      }
    });
  });
});