import io from "socket.io-client";

const socket = io('http://localhost:8082');

socket.on('init', d => console.log('from server:', d));

export const addListener = (evt, handler) => socket.on(evt, handler);

export const removeListener = (evt, handler) => socket.off(evt, handler);

export const emitEvent = (evt, args) => socket.emit(evt, args);