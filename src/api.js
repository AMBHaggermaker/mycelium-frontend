const BASE = 'https://mycelium.unprecedentedtimes.org/api';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function qs(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
}

const get  = (path, token)        => request('GET',    path, undefined, token);
const post = (path, body, token)  => request('POST',   path, body,      token);
const patch= (path, body, token)  => request('PATCH',  path, body,      token);
const del  = (path, token)        => request('DELETE', path, undefined, token);

export default {
  // Auth
  register:   (data)                  => post('/auth/register', data),
  login:      (data)                  => post('/auth/login', data),
  me:         (token)                 => get('/auth/me', token),

  // Posts
  getPosts:   (params, token)         => get(`/posts${qs(params)}`, token),
  getPost:    (id, token)             => get(`/posts/${id}`, token),
  createPost: (data, token)           => post('/posts', data, token),
  updatePost: (id, data, token)       => patch(`/posts/${id}`, data, token),
  deletePost: (id, token)             => del(`/posts/${id}`, token),

  // Circles
  getCircles:     (params)            => get(`/circles${qs(params)}`),
  getCircle:      (id)                => get(`/circles/${id}`),
  createCircle:   (data, token)       => post('/circles', data, token),
  joinCircle:     (id, token)         => post(`/circles/${id}/join`, {}, token),
  leaveCircle:    (id, token)         => del(`/circles/${id}/leave`, token),
  getCircleMembers: (id)              => get(`/circles/${id}/members`),
  getCirclePosts: (id, params)        => get(`/circles/${id}/posts${qs(params)}`),
  getCircleThreads: (id)              => get(`/circles/${id}/threads`),

  // Users
  getUser:        (id)                => get(`/users/${id}`),
  updateUser:     (id, data, token)   => patch(`/users/${id}`, data, token),
  getUserPosts:   (id, params)        => get(`/users/${id}/posts${qs(params)}`),
  getUserCircles: (id)                => get(`/users/${id}/circles`),

  // Reservations
  createReservation: (data, token)    => post('/reservations', data, token),
  cancelReservation: (id, token)      => del(`/reservations/${id}`, token),

  // Threads
  getThread:   (id)                   => get(`/threads/${id}`),
  createThread:(data, token)          => post('/threads', data, token),
  addMessage:  (id, data, token)      => post(`/threads/${id}/messages`, data, token),

  uploadAvatar: (id, file, token) => {
    const form = new FormData();
    form.append('avatar', file);
    return fetch(`${BASE}/users/${id}/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async res => {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  },

  uploadPostMedia: (postId, files, token) => {
    const form = new FormData();
    files.forEach(f => form.append('media', f));
    return fetch(`${BASE}/posts/${postId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async res => {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  },

  deletePostMedia: (postId, mediaId, token) => del(`/posts/${postId}/media/${mediaId}`, token),

  // Post reporting
  reportPost: (id, token)             => post(`/posts/${id}/report`, {}, token),

  // Search
  search: (params)                    => get(`/search${qs(params)}`),

  // Chat
  getChatRooms:    ()                 => get('/chat/rooms'),
  createChatRoom:  (data, token)      => post('/chat/rooms', data, token),
  getChatMessages: (slug)             => get(`/chat/rooms/${slug}/messages`),

  // Chat room reporting
  reportRoom: (slug, token)               => post(`/chat/rooms/${slug}/report`, {}, token),

  // Admin
  getModerationQueue: (token)              => get('/admin/moderation', token),
  clearPostFlag:      (postId, token)      => patch(`/admin/moderation/${postId}/clear`, {}, token),
  removePost:         (postId, token)      => del(`/admin/moderation/${postId}`, token),
  getAdminUsers:      (token)              => get('/admin/users', token),
  setUserRole:        (userId, role, token) => patch(`/admin/users/${userId}/role`, { role }, token),

  // Admin chat-room management
  getAdminChatRooms:    (token)              => get('/admin/chat-rooms', token),
  deleteAdminChatRoom:  (roomId, token)      => del(`/admin/chat-rooms/${roomId}`, token),
  flagAdminChatRoom:    (roomId, token)      => patch(`/admin/chat-rooms/${roomId}/flag`, {}, token),
};
