import io from "socket.io-client";

const host = document.baseURI,
    path = host.includes('dataviz.nyct.com') ? '/grand_exchange/socket.io' : '/socket.io';

const url = `http://${location.host}`;

const socket = io(url, { path });

window.socket = socket;

socket.on('init', d => console.log('from server:', d));

export const addListener = (evt, handler) => socket.on(evt, handler);

export const removeListener = (evt, handler) => socket.listeners(evt).pop();

export const emitEvent = (evt, args) => socket.emit(evt, args);

export const requestConnection = (args, fn) => {
    let api_url = `${host}connect/${args.exchange_type}`;
    fetch(api_url, { method: 'post', body: JSON.stringify(args), headers: { "Content-Type": "application/json" } })
        .then(d => d.json())
        .then(fn);
}

export const sendHeartbeat = arr => socket.emit('heartbeat', arr);