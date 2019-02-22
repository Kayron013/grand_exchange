import io from "socket.io-client";

const socket = io('http://localhost:8083');

window.socket = socket;

socket.on('init', d => console.log('from server:', d));

export const addListener = (evt, handler) => socket.on(evt, handler);

export const removeListener = (evt, handler) => socket.listeners(evt).pop();

export const emitEvent = (evt, args) => socket.emit(evt, args);

export const requestConnection = (args, fn) => {
    const res = fetch('http://localhost:8083', { method: 'post', body: JSON.stringify(args), headers: { "Content-Type": "application/json" } })
        .then(d => { return d.json() })
        .then(fn);
    //socket.emit('connection-request', args);
    //socket.once('connection-response', res => fn(res));
}