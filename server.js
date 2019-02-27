const express = require('express'),
    path = require('path'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    amqp = require('amqplib/callback_api');
    //zmq = require('zmq');

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


const connections = {};
global.connections = connections;


const consume = (server, exchange, routing_key, res, ch, q) => {
    console.log("connection is ", connections);
    const event_key = `${server}:${exchange}:${routing_key}`;
        console.log('consuming; evt key:', event_key);
        res.json({ status: 'ok' });
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
                    case null:
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
                                connections[server] = {
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
            connections[server].exchanges[exchange] = {
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
        connections[server].exchanges[exchange].routes[routing_key] = { connections: 1 };
        consume(server, exchange, routing_key, res, ch, q);
    })
}

app.post('/', (req, res) => {
    const { username, password, server, exchange, routing_key } = req.body;
    if (connections[server] && connections[server].credentials.username==username && connections[server].credentials.password==password) {
        const connection = connections[server];
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


// const socket = zmq.socket('sub');
// socket.bind('tcp://10.50.78.151:5556', (err) => err ? console.log(err) : console.log('listening'));
// // console.log('zmq "connected"');
// // socket.subscribe('');
// socket.on('message', (topic, message) => console.log(topic, message));


// const contents = [
//     {
//         name: 'content1',
//         stuff: {
//             key1: 'prop1',
//             thinger2: 'thingee2',
//             innerobj3: {
//                 name: 'innerobj3',
//                 stuff: '...'
//             }
//         },
//         isSomething: false
//     },
//     {
//         name: 'content2',
//         different_stuff: {
//             key_1: 'prop_1',
//             important_number: 2,
//             inner_obj_3: {
//                 name: 'inner_obj_3',
//                 stuff: '...',
//             }
//         },
//         other_stuff: {
//             important_info: 'this is important',
//             very_important_info: 'this is very important',
//             uber_important_objs: [
//                 {
//                     name: 'uio_1',
//                     super: 'this is super duper important',
//                     important_bool: true
//                 },
//                 {
//                     name: 'uio_2',
//                     super: 'this is equally important',
//                     important_bool: false
//                 },
                
//             ]
//         }
//     }
// ];

// let content_index = 0;
// const switchIndex = _ => { content_index = content_index ? 0 : 1 };

// const constructData = _ => {
//     switchIndex();
//     return {
//         timestamp: Date.now(),
//         content: contents[content_index]
//     }
// }

// const sample_key = `${'10.52.79.211'}:${'some_exchange'}:${''}`;
// setInterval(() => io.emit(sample_key, constructData()), 1000);

const port = 8083;
http.listen(port, console.log(`Server listening on port ${port}.\nHot-reloadable server listening on port 8084`))