// Imports
const express = require('express');
const http = require('http');
const url = require('url');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

// Set up app
const app = express();

// Parse request bodies
app.use(bodyParser.json())

// CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next()
})

const server = http.createServer(app);
const sensor = new WebSocket.Server({ server, path='/sensor' });
const sensors = new WebSocket.Server({ server, path='/' });

// A table for which clients each sensor is talking to.
let sensorTable = {}

sensor.on('connection', (ws, req) => {
  ws.on('message', message => {
    if(!sensorTable[message]) sensorTable = []

    sensorTable[message].push(ws)
  })
})


sensors.on('connection', function connection(ws, req) {
  const location = url.parse(req.url, true);
  // You might use location.query.access_token to authenticate or share sessions
  // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

});

function sendToWSClients(data) {
  sensors.clients.forEach(client => {
    if(client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data))
    }
  })

  let id = data.id
  let toRemove = []
  sensorTable[id].forEach(client => {
    if(client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data))
    }
    else if(!client.isAlive) {
      client.terminate()
      toRemove.push(client)
    }
  }

  sensorTable[message] = sensorTable[message].filter(client => {
    return toRemove.find(client)
  })
}

app.post('/', (req, res) => {
  let data = req.body

  if(!data.id) return res.status(404).send('Not found')

  sendToWSClients(data)

  res.send(JSON.stringify(data))
})

app.post('/:sensorId', (req, res) => {
  let id = req.params.sensorId

  let data = {
    ...req.body,
    id
  }

  sendToWSClients(data)

  res.send(JSON.stringify(data))
})

server.listen(8080, function listening() {
  console.log('Listening on %d', server.address().port);
});
