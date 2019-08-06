const express = require('express'),
  path = require('path'),
  app = express(),
  http = require('http').Server(app),
  io = require('socket.io')(http),
  port = 8083,
  reload = require('reload'),
  reload_server = reload(app, { port: 9083 }),
  watch = require('watch'),
  amqp = require('amqplib/callback_api'),
  zmq = require('zeromq'),
  mqtt = require('mqtt'),
  ping = require('ping'),
  pickle = require('./modules/jsonpickle');

watch.watchTree('dist', _ => reload_server.reload());

app.use(express.static(path.join(__dirname, 'dist/')));

app.use(express.json());

app.get('/', (req, res) => res.sendFile('index'));

const connections = { rmq: {}, zmq: {}, mqtt: {} };
global.connections = connections;

const createEventKey = (type, props) =>
  type == 'rmq'
    ? `rmq::${props.server}::${props.exchange}::${props.routing_key}`
    : type == 'zmq'
    ? `zmq::${props.server}:${props.port}`
    : type == 'mqtt'
    ? `mqtt::${props.server}::${props.topic}`
    : null;

const pingServer = async server => {
  const res = { is_alive: false, err: null };

  await ping.promise
    .probe(server)
    .then(r => {
      res.is_alive = r.alive;
    })
    .catch(err => {
      res.err = err;
    });

  return res;
};

//
//
//
/* Rabbit MQ Connections */
//
//
//

/** A name that identifies GE queues in an exchange's bindings list. */
const nameQ = () => 'grand-exchange_' + Math.random();

const consume = (server, exchange, routing_key, serialization, res, ch, q) => {
  const event_key = createEventKey('rmq', { server, exchange, routing_key });
  res.json({ status: 'ok', event_key });
  ch.consume(
    q.queue,
    async msg => {
      try {
        const content =
          serialization == 'json' ? JSON.parse(msg.content) : await pickle.load(msg.content.toString('base64'));
        if (!content) throw 'unknown serialization error';
        const data = { timestamp: Date.now(), content };
        io.emit(event_key, data);
      } catch (err) {
        io.emit(event_key, { timestamp: Date.now(), content: { unparsable: null } });
      }
    },
    { noAck: true }
  );
};

const testExchange = (ex, is_durable, type, conn) =>
  new Promise((resolve, reject) => {
    conn.createChannel((err, ch) => {
      ch.on('error', err => {
        switch (err.code) {
          case 404:
            resolve([false, 'Exchange Does Not Exist']);
            break;
          case 406:
            resolve([false, 'Exchange Declared With Incorrect Types']);
            break;
          default:
            resolve([false, `Unknown Channel Error (${err.code})`]);
            console.error('**test exchange error**', err);
        }
      });
      ch.checkExchange(ex);
      ch.assertExchange(ex, type, { durable: is_durable }, (err, ok) => (ok ? resolve([true]) : null));
    });
  });

const makeRmqConnection = (
  { username, password, server, exchange, routing_key = '', is_durable, type, serialization },
  res,
  event_key
) => {
  /*
   * The callback function gets called twice on error.
   * The second call will throw an error for trying to reuse the ended result object.
   */
  let calls = 0;
  amqp.connect(`amqp://${username}:${password}@${server}`, (err, conn) => {
    calls++;
    if (err) {
      if (calls > 1) return;
      switch (err.code) {
        case undefined:
          res.json({ status: 'error', error: 'Authentication Failed' });
          break;
        case 'ETIMEDOUT':
          res.json({ status: 'error', error: 'Timed Out' });
          break;
        case 'EHOSTUNREACH':
        case 'ENETUNREACH':
          res.json({ status: 'error', error: 'Server Unreachable' });
          break;
        case 'ECONNREFUSED':
          res.json({ status: 'error', error: 'Connection Refused' });
          break;
        default:
          res.json({ status: 'error', error: 'Unknown Connection Error' });
          console.error('**connection error**', err, err.code);
      }
    } else {
      conn.on('error', err => {
        io.emit(event_key, { timestamp: Date.now(), content: { $SERVER_ERROR$: err } });
        delete connections.rmq[server];
      });

      conn.createChannel(async (err, ch) => {
        if (err) console.error('Channel Error [1]', err);
        else {
          ch.on('error', err => console.error('Channel Error [2]', err));
          const [pass, err_msg] = await testExchange(exchange, is_durable, type, conn);
          if (pass) {
            ch.assertExchange(exchange, type, { durable: is_durable });
            ch.assertQueue(nameQ(), { exclusive: true }, (err, q) => {
              ch.bindQueue(q.queue, exchange, routing_key);
              connections.rmq[server] = {
                connection: conn,
                channel: ch,
                credentials: { username, password },
                exchanges: {
                  [exchange]: {
                    routes: {
                      [routing_key]: true
                    }
                  }
                },
                heartbeat: Date.now(),
                close: _ => conn.close()
              };
              consume(server, exchange, routing_key, serialization, res, ch, q);
            });
          } else {
            conn.close();
            res.json({ status: 'error', error: err_msg });
          }
        }
      });
    }
  });
};

const reuseChannel = async ({ server, exchange, routing_key = '', is_durable, type, serialization }, res, conn, ch) => {
  const [pass, err_msg] = await testExchange(exchange, is_durable, type, conn);
  if (pass) {
    ch.assertExchange(exchange, type, { durable: is_durable });
    ch.assertQueue(nameQ(), { exclusive: true }, (err, q) => {
      ch.bindQueue(q.queue, exchange, routing_key);
      connections.rmq[server].exchanges[exchange] = {
        routes: {
          [routing_key]: true
        }
      };
      consume(server, exchange, routing_key, serialization, res, ch, q);
    });
  } else {
    res.json({ status: 'error', error: err_msg });
  }
};

const reuseExchange = ({ server, exchange, routing_key = '', serialization }, res, ch) => {
  ch.assertQueue(nameQ(), { exclusive: true }, (err, q) => {
    ch.bindQueue(q.queue, exchange, routing_key);
    connections.rmq[server].exchanges[exchange].routes[routing_key] = true;
    consume(server, exchange, routing_key, serialization, res, ch, q);
  });
};

app.post('/connect/rmq', (req, res) => {
  const { username, password, server, exchange, routing_key } = req.body;
  const event_key = createEventKey('rmq', { server, exchange, routing_key });
  const connection = connections.rmq[server];
  if (connection && connection.credentials.username == username && connection.credentials.password == password) {
    if (connection.exchanges[exchange]) {
      const route = connection.exchanges[exchange].routes[routing_key];
      if (route) {
        res.json({ status: 'ok', event_key });
      } else {
        reuseExchange(req.body, res, connection.channel);
      }
    } else {
      reuseChannel(req.body, res, connection.connection, connection.channel);
    }
  } else {
    makeRmqConnection(req.body, res, event_key);
    console.log('attempted new connection =>', event_key);
  }
});

//
//
//
/* Zero MQ Connections */
//
//
//

const makeZmqConnection = async ({ server, port }, res) => {
  const event_key = createEventKey('zmq', { server, port }),
    socket = zmq.socket('sub'),
    ping_res = await pingServer(server);

  if (ping_res.err) {
    console.error(`Error pinging ${server}`);
    return res.json({ status: 'error', error: 'Server Error' });
  } else if (!ping_res.is_alive) {
    return res.json({ status: 'error', error: 'Server Unreachable' });
  }
  socket.connect(`tcp://${server}:${port}`);
  socket.on('message', msg => {
    try {
      const data = { timestamp: Date.now(), content: JSON.parse(msg.toString()) };
      io.emit(event_key, data);
    } catch (err) {
      io.emit(event_key, { unparsable: null });
    }
  });
  socket.subscribe('');
  res.json({ status: 'ok', event_key });
  connections.zmq[`${server}:${port}`] = {
    socket,
    heartbeat: Date.now(),
    close: _ => socket.close()
  };
};

app.post('/connect/zmq', (req, res) => {
  const { server, port } = req.body,
    event_key = createEventKey('zmq', { server, port });
  if (connections.zmq[`${server}:${port}`]) {
    res.json({ status: 'ok', event_key });
  } else {
    makeZmqConnection(req.body, res);
    console.log('attempted new connection =>', event_key);
  }
});

//
//
//
/* Mosquitto Connections */
//
//
//

const mqttConsume = (client, server, topic, res) => {
  const event_key = createEventKey('mqtt', { server, topic });
  res.json({ status: 'ok', event_key });
  client.on('message', (msg_topic, msg) => {
    if (!topic || topic === msg_topic) {
      try {
        const data = { timestamp: Date.now(), content: JSON.parse(msg.toString()) };
        io.emit(event_key, data);
      } catch (err) {
        io.emit(event_key, { unparsable: null });
      }
    }
  });
};

const makeMqttConnection = async ({ server, topic }, res) => {
  const client = mqtt.connect(`mqtt://${server}`);
  let error = null;

  client.on('error', err => {
    error = true;
    switch (err.code) {
      case 4:
        res.json({ status: 'error', error: 'Connection Refused' });
        break;
      default:
        console.error('Mqtt Error:', err);
        res.json({ status: 'error', error: 'Unknown Connection Error' });
    }
  });

  const ping_res = await pingServer(server);

  if (!error && ping_res.err) {
    console.error(`Error pinging ${server}`);
    return res.json({ status: 'error', error: 'Server Error' });
  } else if (!error && !ping_res.is_alive) {
    return res.json({ status: 'error', error: 'Server Unreachable' });
  }

  timeout = setTimeout(_ => {
    if (error) return;
    client.end();
    res.json({ status: 'error', error: 'Timed Out' });
  }, 6000);

  client.on('connect', _ => {
    clearTimeout(timeout);
    client.subscribe(topic, err => {
      if (err) {
        console.error('mqtt subscribe err', err);
        res.json({ status: 'error', error: '' });
      } else {
        connections.mqtt[server] = {
          client,
          topics: {
            [topic]: topic
          },
          heartbeat: Date.now(),
          close: _ => client.end(true)
        };
        mqttConsume(client, server, topic, res);
      }
    });
  });
};

const reuseMqttClient = ({ server, topic }, client, res) => {
  client.subscribe(topic);
  connections.mqtt[server].topics[topic] = topic;
  mqttConsume(client, server, topic, res);
};

app.post('/connect/mqtt', (req, res) => {
  const { server, topic } = req.body,
    event_key = createEventKey('mqtt', { server, topic }),
    connection = connections.mqtt[server];
  if (connection) {
    if (connection.topics[topic]) {
      res.json({ status: 'ok', event_key });
    } else {
      reuseMqttClient(req.body, connection.client, res);
    }
  } else {
    makeMqttConnection(req.body, res);
    console.log('attempted new connection =>', event_key);
  }
});

//
//
//
/* Managing Connections */
//
//
//

io.on('connection', socket => {
  socket.on('heartbeat', arr => {
    const dead_connections = [];
    arr.forEach(el => {
      if (connections[el.type][el.server]) connections[el.type][el.server].heartbeat = Date.now();
      else dead_connections.push(el);
    });
    if (dead_connections.length) socket.emit('dead-connection', dead_connections);
  });
});

/** 4 Days */
const Threshold = 4 * 8.64e7;

const isDead = heartbeat => Date.now() - heartbeat >= Threshold;
const checkHeartbeat = _ => {
  for (const type in connections) {
    for (const server in connections[type]) {
      const connection = connections[type][server];
      if (isDead(connection.heartbeat)) {
        connection.close();
        delete connections[type][server];
        console.log(`Connection to ${type}:${server} closed`);
      }
    }
  }
};

setInterval(checkHeartbeat, Threshold);

http.listen(port, function() {
  let date = new Date();
  console.log('Current Datetime:', date.toLocaleDateString(), date.toLocaleTimeString());
  console.log(`listening on port ${port}`);
});
