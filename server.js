const express = require('express'),
    path = require('path'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    amqp = require('amqplib/callback_api');

app.use(express.static(path.join(__dirname, 'dist/')));

app.use(express.json());

app.get('/', (req, res) => res.sendFile('index'));


app.use((req, res, next) => {
    res.header({
    'Access-Control-Allow-Origin': req.headers.origin.includes('localhost') ? req.headers.origin : '',
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
    'Vary': 'Origin'
    });
    next();
    });


const connections = {};
global.connections = connections;

const makeConnection = ({ username, password, server, exchange, routing_key = '', is_durable }, res) => {
    try {
        amqp.connect(`amqp://${username}:${password}@${server}`, (err, conn) => {
            if (err) { throw { message: 'connection failed', error: err } }
            console.log(username, password, server, exchange, routing_key, is_durable);
            conn.createChannel((err, ch) => {
                ch.assertExchange(exchange, routing_key ? 'direct' : 'fanout', { durable: is_durable });
                ch.assertQueue('', { exclusive: true }, (err, q) => {
                    ch.bindQueue(q.queue, exchange, routing_key);
                    connections[server] = {
                        channel: ch,
                        exchanges: [{
                            exchange,
                            routes: [{
                                routing_key,
                                connections: 1
                            }]
                        }]
                    };
                    const event_key = `${server}:${exchange}:${routing_key}`;
                    console.log('consuming; evt key:', event_key);
                    res.json({ status: 'ok' });
                    ch.consume(q.queue, msg => {
                        const data = { timestamp: Date.now(), content: JSON.parse(msg.content) }
                        io.emit(event_key, data, { noAck: true });
                        //console.log('emitted:', data);
                    }, { noAck: true });
                });
            });
        });
    }
    catch (err) {
        return { status: 'error', err };
    }
    
}

app.post('/', (req, res) => {
    console.log(req.body);
    makeConnection(req.body, res);
})

io.on('connect', socket => {
    socket.on('connection-request', req => {
        makeConnection(req, socket);
    });
});


const contents = [
    {
        name: 'content1',
        stuff: {
            key1: 'prop1',
            thinger2: 'thingee2',
            innerobj3: {
                name: 'innerobj3',
                stuff: '...'
            }
        },
        isSomething: false
    },
    {
        name: 'content2',
        different_stuff: {
            key_1: 'prop_1',
            important_number: 2,
            inner_obj_3: {
                name: 'inner_obj_3',
                stuff: '...',
            }
        },
        other_stuff: {
            important_info: 'this is important',
            very_important_info: 'this is very important',
            uber_important_objs: [
                {
                    name: 'uio_1',
                    super: 'this is super duper important',
                    important_bool: true
                },
                {
                    name: 'uio_2',
                    super: 'this is equally important',
                    important_bool: false
                },
                
            ]
        }
    }
];

let content_index = 0;
const switchIndex = _ => { content_index = content_index ? 0 : 1 };

const constructData = _ => {
    switchIndex();
    return {
        timestamp: Date.now(),
        content: contents[content_index]
    }
}

const sample_key = `${'10.52.79.211'}:${'some_exchange'}:${''}`;
setInterval(() => io.emit(sample_key, constructData()), 1000);

const port = 8083;
http.listen(port, console.log(`Server listening on port ${port}`))