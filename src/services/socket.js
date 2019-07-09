import io from 'socket.io-client';

const host = document.baseURI,
  res = host.match(/[\w\.-]+(:\d+)?\/(\w+)\//),
  path = res ? `/${res[2]}/socket.io` : '/socket.io';

const socket = io({ path });

window.socket = socket;

export const addListener = (evt, handler) => socket.on(evt, handler);

export const removeListener = evt => socket.off(evt);

export const emitEvent = (evt, args) => socket.emit(evt, args);

export const requestConnection = (args, fn) => {
  let api_url = `${host}connect/${args.exchange_type}`;
  fetch(api_url, { method: 'post', body: JSON.stringify(args), headers: { 'Content-Type': 'application/json' } })
    .then(d => d.json())
    .then(fn);
};

export const sendHeartbeat = arr => socket.emit('heartbeat', arr);
