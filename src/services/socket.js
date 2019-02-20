import io from "socket.io-client";

const socket = io('http://localhost:8083');

socket.on('init', d => console.log('from server:', d));

export const addListener = (evt, handler) => socket.on(evt, handler);

export const removeListener = (evt, handler) => socket.off(evt, handler);

export const emitEvent = (evt, args) => socket.emit(evt, args);

export const requestConnection = (args, fn) => {
    socket.emit('connection-request', args);
    socket.once('connection-response', res => fn(res));
}