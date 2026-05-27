import { io } from 'socket.io-client';

const SOCKET_URL = 'https://mycelium.unprecedentedtimes.org';

let _socket = null;
let _token  = null;

export function getSocket(token) {
  if (_socket && _token === token && _socket.connected) return _socket;

  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _token = token;
  _socket = io(SOCKET_URL, {
    path: '/api/socket.io',
    transports: ['polling', 'websocket'],
    auth: { token },
  });

  return _socket;
}

export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
    _token  = null;
  }
}
