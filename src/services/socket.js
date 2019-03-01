import io from "socket.io-client";

const url = `http://${location.hostname}:8083`;

const socket = io(url);

window.socket = socket;

socket.on('init', d => console.log('from server:', d));

export const addListener = (evt, handler) => socket.on(evt, handler);

export const removeListener = (evt, handler) => socket.listeners(evt).pop();

export const emitEvent = (evt, args) => socket.emit(evt, args);

export const requestConnection = (args, fn) => {
    let api_url = `${url}/connect/${args.type}`;
    fetch(api_url, { method: 'post', body: JSON.stringify(args), headers: { "Content-Type": "application/json" } })
        .then(d => d.json())
        .then(fn);
}

export const sendHeartbeat = arr => socket.emit('heartbeat', arr);