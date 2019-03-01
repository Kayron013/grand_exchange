const express = require('express'),
    path = require('path'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    amqp = require('amqplib/callback_api'),
    zmq = require('zeromq'),
    mqtt = require('mqtt');

app.use(express.static(path.join(__dirname, 'dist/')));

app.use(express.json());

app.get('/', (req, res) => res.sendFile('index'));


app.use((req, res, next) => {
    if (req.headers.origin) {
        res.header({
            'Access-Control-Allow-Origin': req.headers.origin.includes('localhost') ? req.headers.origin : '',
            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
            'Vary': 'Origin'
        });
    }
    next();
});


const connections = { rmq: {}, zmq: {}, mqtt: {} };
global.connections = connections;


const getEventKey = (type, props) =>
    type == 'rmq' ? `rmq::${props.server}::${props.exchange}::${props.routing_key}` :
    type == 'zmq' ? `zmq::${props.server}:${props.port}` :
    type == 'mqtt' ? `mqtt::${props.server}::${props.topic}` : null;


//
//
//
/* Rabbit MQ Connections */
//
//
//

const consume = (server, exchange, routing_key, res, ch, q) => {
    const event_key = getEventKey('rmq', {server, exchange, routing_key });
    console.log('new connection =>', event_key);
    res.json({ status: 'ok', event_key });
    ch.consume(q.queue, msg => {
        try {
            const data = { timestamp: Date.now(), content: JSON.parse(msg.content) }
            io.emit(event_key, data);
            //console.log('emitted:', data);
        }
        catch (err) {
            io.emit(event_key, { timestamp: Date.now(), content: { unparsable: null } });
        }
    }, { noAck: true });
}


const testExchange = (ex, rk, is_durable, conn) => new Promise((resolve, reject) => {
    conn.createChannel((err, ch) => {
        ch.on('error', err => {
            switch (err.code) {
                case 404:
                    resolve([false, 'Exchange Does Not Exist']);
                    break;
                case 406:
                    resolve([false, 'Exchange Declared With Incorrect Types']);
                    break;
            }
            console.log(err);
        });
        ch.checkExchange(ex);
        ch.assertExchange(ex, rk ? 'direct' : 'fanout', { durable: is_durable }, (err, ok) => ok ? resolve([true]) : null);
    });
});


const makeRmqConnection = ({ username, password, server, exchange, routing_key = '', is_durable }, res) => {
    let calls = 0;
    amqp.connect(`amqp://${username}:${password}@${server}`, (err, conn) => {
        calls++;
            if (err) {
                console.log('**connection error**', err, err.code);
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
                        console.log('******************************\n******************************');
                }
            }
            else {
                console.log(server, exchange, routing_key, is_durable);
                conn.createChannel(async (err, ch) => {
                    ch.on('error', err => console.log('Channel Error[1]', err));
                    if (err) console.log('channel error[2]', err);
                    else {
                        const test = await testExchange(exchange, routing_key, is_durable, conn);
                        if (test[0]) {          
                            ch.assertExchange(exchange, routing_key ? 'direct' : 'fanout', { durable: is_durable });
                            ch.assertQueue('', { exclusive: true }, (err, q) => {
                                ch.bindQueue(q.queue, exchange, routing_key);
                                connections.rmq[server] = {
                                    connection: conn,
                                    channel: ch,
                                    credentials: { username, password },
                                    exchanges: {
                                        [exchange]: {
                                            routes: {
                                                routing_key
                                            },
                                        }
                                    },
                                    heartbeat: Date.now(),
                                    close: function () { this.connection.close() }
                                };
                                consume(server, exchange, routing_key, res, ch, q);
                            });
                        }
                        else {
                            conn.close();
                            res.json({ status: 'error', error: test[1] });
                            console.log(test[1])
                        }
                    }
                });
            }
        });
}


const reuseChannel = async ({ server, exchange, routing_key = '', is_durable }, res, conn, ch) => {
    const test = await testExchange(exchange, routing_key, is_durable, conn);
    if (test[0]) {
        ch.assertExchange(exchange, routing_key ? 'direct' : 'fanout', { durable: is_durable });
        ch.assertQueue('', { exclusive: true }, (err, q) => {
            ch.bindQueue(q.queue, exchange, routing_key);
            connections.rmq[server].exchanges[exchange] = {
                routes: {
                    routing_key
                },
            };
            consume(server, exchange, routing_key, res, ch, q);
        });
    }
    else {
        res.json({ status: 'error', error: test[1] });
        console.log(test[1])
    }
}


const reuseExchange = ({ server, exchange, routing_key = '' }, res, ch) => {
    ch.assertQueue('', { exclusive: true }, (err, q) => {
        ch.bindQueue(q.queue, exchange, routing_key);
        connections.rmq[server].exchanges[exchange].routes[routing_key] = { connections: 1 };
        consume(server, exchange, routing_key, res, ch, q);
    })
}


app.post('/connect/rmq', (req, res) => {
    const { username, password, server, exchange, routing_key } = req.body,
        event_key = getEventKey('rmq', {server, exchange, routing_key });
        connection = connections.rmq[server];
    if (connection && connection.credentials.username == username && connection.credentials.password == password) {
        
        if (connection.exchanges[exchange]) {
            const route = connection.exchanges[exchange].routes[routing_key];
            if (route) {
                res.json({ status: 'ok', event_key });
            }
            else {
                reuseExchange(req.body, res, connection.channel);
            }
        }
        else {
            reuseChannel(req.body, res, connection.connection, connection.channel);
        }
    }
    else {
        makeRmqConnection(req.body, res);
    }
});

//
//
//
/* Zero MQ Connections */
//
//
//

const makeZmqConnection = ({ server, port }, res) => {
    const event_key = getEventKey('zmq', { server, port }),
        socket = zmq.socket('sub');
    socket.connect(`tcp://${server}:${port}`);
    socket.on('message', msg => {
        try {
            const data = { timestamp: Date.now(), content: JSON.parse(msg.toString()) };
            io.emit(event_key, data);
        }
        catch (err) {
            io.emit(event_key, { unparsable: null });
        }
    });
    socket.subscribe('');
    res.json({ status: 'ok', event_key });
    connections.zmq[`${server}:${port}`] = {
        socket,
        heartbeat: Date.now(),
        close: function () { this.socket.close() } 
    };
    console.log('new connection =>', event_key);
}


app.post('/connect/zmq', (req, res) => {
    const { server, port } = req.body,
        event_key = getEventKey('zmq', { server, port });
    if (connections.zmq[`${server}:${port}`]) {
        res.json({ status: 'ok', event_key });
    }
    else {
        makeZmqConnection(req.body, res);
    }
});

//
//
//
/* Mosquitto Connections */
//
//
//

const mqttConsume = (client, server, topic , res) => {
    const event_key = getEventKey('mqtt', { server, topic });
    res.json({ status: 'ok', event_key });
    client.on('message', (msg_topic, msg) => {
        if (topic == msg_topic) {
            try {
                const data = { timestamp: Date.now(), content: JSON.parse(msg.toString()) };
                io.emit(event_key, data);
            }
            catch (err) {
                io.emit(event_key, { unparsable: null });
            }
        }
    });
    console.log('new connection =>', event_key);
}


const makeMqttConnection = ({ server, topic, },  res) => {
    const client = mqtt.connect(`mqtt://${server}`);
    client.on('connect', _ => {
        client.subscribe(topic, err => {
            if (err) {
                console.log(err);
                res.json({ status: 'error', error: '' });
            }
            else {
                connections.mqtt[server] = {
                    client,
                    topics: {
                        [topic]: topic
                    },
                    heartbeat: Date.now(),
                    close: function () { this.client.end(true) }
                }
                mqttConsume(client, server, topic, res);
            }
        });
    });
}


const reuseMqttClient = ({ server, topic, }, client, res) => {
    client.subscribe(topic);
    connections.mqtt[server].topics[topic] = topic;
    mqttConsume(client, server, topic, res);
}


app.post('/connect/mqtt', (req, res) => {
    const { server, topic } = req.body,
        event_key = getEventKey('mqtt', { server, topic }),
        connection = connections.mqtt[server];
    if (connection) {
        if (connection.topics[topic]) {
            res.json({ status: 'ok', event_key });
        }
        else {
            reuseMqttClient(req.body, connection.client, res);
        }
    }
    else {
        makeMqttConnection(req.body, res);
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
    socket.on('heartbeat', arr => arr.forEach(el => {
        if (connections[el.type][el.server])
            connections[el.type][el.server].heartbeat = Date.now()
    }));
});


const isDead = heartbeat => Date.now() - heartbeat >= 3600000;
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
}

setInterval(checkHeartbeat, 3600000);


const port = 8083;
http.listen(port, console.log(`Server listening on port ${port}.\nHot-reloadable server listening on port 8084`))