const express = require('express'),
    path = require('path'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http);

app.use(express.static(path.join(__dirname, 'dist/')));

app.get('/', (req, res) => res.sendFile('index'));

io.on('connect', socket => socket.emit('init', 'init message'));


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

setInterval(() => io.emit('some_exchange', constructData()), 1000);

const port = 8083;
http.listen(port, console.log(`Server listening on port ${port}`))