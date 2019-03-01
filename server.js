const express = require('express'),
    path = require('path'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    amqp = require('amqplib/callback_api'),
    zmq = require('zmq');

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


const connections = { rmq: {}, zmq: {}, msq: {} };
global.connections = connections;


const consume = (server, exchange, routing_key, res, ch, q) => {
    const event_key = `rmq:${server}:${exchange}:${routing_key}`;
    console.log('consuming; evt key:', event_key);
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


const makeConnection = ({ username, password, server, exchange, routing_key = '', is_durable }, res) => {
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
                                                [routing_key]: { connections: 1 }
                                            },
                                        }
                                    }
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
                    [routing_key]: { connections: 1 }
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
    const { username, password, server, exchange, routing_key } = req.body;
    const connection = connections.rmq[server];
    if (connection && connection.credentials.username == username && connection.credentials.password == password) {
        
        if (connection.exchanges[exchange]) {
            const route = connection.exchanges[exchange].routes[routing_key];
            if (route) {
                route.connections++;
                res.json({ status: 'ok' });
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
        makeConnection(req.body, res);
    }
});


const makeZmqConnection = (server, res) => {
    const event_key = `zmq:${server}`;
    console.log('consuming; evt key:', event_key);
    
    const socket = zmq.socket('sub');
    socket.connect(`tcp://${server}:5556`);
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
    connections.zmq[server] = server;
}

app.post('/connect/zmq', (req, res) => {
    console.log('zmq request')
    const { server } = req.body;
    if (connections.zmq[server]) {
        res.json({ status: 'ok' });
    }
    else {
        makeZmqConnection(server, res);
    }
});



const port = 8083;
http.listen(port, console.log(`Server listening on port ${port}.\nHot-reloadable server listening on port 8084`))