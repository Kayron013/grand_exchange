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
        }
    },
    {
        name: 'content2',
        different_stuff: {
            key_1: 'prop_1',
            thinger_2: 'thingee_2',
            inner_obj_3: {
                name: 'inner_obj_3',
                stuff: '...'
            }
        },
        other_stuff: {
            important_info: 'this is important',
            very_important_info: 'this is very important',
            inner_obj: {
                name: 'inner_obj',
                super: 'this is super duper important'
            }
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

const port = 8082;
http.listen(port, console.log(`Server listening on port ${port}`))