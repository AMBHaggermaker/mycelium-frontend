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
  register:        (data)             => post('/auth/register', data),
  login:           (data)             => post('/auth/login', data),
  me:              (token)            => get('/auth/me', token),
  checkEmail:      (email)            => get(`/auth/check-email?email=${encodeURIComponent(email)}`),
  restoreAccount:  (userId, data)     => post(`/auth/restore/${userId}`, data),

  // Posts
  getPosts:           (params, token)  => get(`/posts${qs(params)}`, token),
  getPost:            (id, token)      => get(`/posts/${id}`, token),
  getPostComments:    (id)             => get(`/posts/${id}/comments`),
  addPostComment:     (id, data, token)=> post(`/posts/${id}/comments`, data, token),
  getMyReservation:   (id, token)      => get(`/posts/${id}/my-reservation`, token),
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
  getUser:            (id)                => get(`/users/${id}`),
  updateUser:         (id, data, token)   => patch(`/users/${id}`, data, token),
  getUserPosts:       (id, params)        => get(`/users/${id}/posts${qs(params)}`),
  getUserCircles:     (id)                => get(`/users/${id}/circles`),
  declareVeteran:     (id, data, token)   => patch(`/users/${id}/declare-veteran`, data, token),
  vouchVeteran:       (id, token)         => post(`/users/${id}/vouch-veteran`, {}, token),

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
  deleteUser:             (userId, token)   => patch(`/admin/users/${userId}/delete`, {}, token),
  restoreUser:            (userId, token)   => patch(`/admin/users/${userId}/restore`, {}, token),
  adminSendPasswordReset: (userId, token)   => post(`/admin/users/${userId}/send-password-reset`, {}, token),

  // Admin chat-room management
  getAdminChatRooms:    (token)              => get('/admin/chat-rooms', token),
  deleteAdminChatRoom:  (roomId, token)      => del(`/admin/chat-rooms/${roomId}`, token),
  flagAdminChatRoom:    (roomId, token)      => patch(`/admin/chat-rooms/${roomId}/flag`, {}, token),

  // Invitations
  sendInvitation:    (data, token)  => post('/invitations', data, token),
  getMyInvitations:  (token)        => get('/invitations', token),
  getInviteByToken:  (token)        => get(`/invitations/token/${token}`),
  deleteInvitation:  (id, token)    => del(`/invitations/${id}`, token),
  resendInvitation:  (id, token)    => post(`/invitations/${id}/resend`, {}, token),

  // Account
  changePassword:       (data, token)   => patch('/auth/change-password', data, token),
  requestEmailChange:   (data, token)   => post('/auth/request-email-change', data, token),
  cancelEmailChange:    (token)         => del('/auth/request-email-change', token),
  verifyEmailChange:    (changeToken)   => get(`/auth/verify-email-change?token=${encodeURIComponent(changeToken)}`),
  forgotPassword:       (data)          => post('/auth/forgot-password', data),
  resetPassword:        (data)          => post('/auth/reset-password', data),

  // Advocate
  getAdvocateCases:       (token)           => get('/advocate/cases', token),
  createAdvocateCase:     (data, token)     => post('/advocate/cases', data, token),
  getAdvocateCase:        (id, token)       => get(`/advocate/cases/${id}`, token),
  updateAdvocateCase:     (id, data, token) => patch(`/advocate/cases/${id}`, data, token),
  deleteAdvocateCase:     (id, token)       => del(`/advocate/cases/${id}`, token),
  addCaseTimeline:        (id, data, token) => patch(`/advocate/cases/${id}/timeline`, data, token),
  uploadCaseEvidence:     (id, file, token) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/advocate/cases/${id}/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async res => {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  },
  getAdvocatePatterns:    (params)          => get(`/advocate/patterns${qs(params)}`),
  getAdvocatePattern:     (id)              => get(`/advocate/patterns/${id}`),
  submitPatternResponse:  (id, data)        => post(`/advocate/patterns/${id}/response`, data),
  getMoralInjuryReports:  (token)           => get('/advocate/moral-injury', token),
  submitMoralInjury:      (data, token)     => post('/advocate/moral-injury', data, token),

  // Direct Messages
  getUnreadCount:         (token)           => get('/messages/unread-count', token),
  getConversations:       (token)           => get('/messages/conversations', token),
  getThread:              (userId, token)   => get(`/messages/${userId}`, token),
  sendMessage:            (userId, data, token) => post(`/messages/${userId}`, data, token),
  reportMessage:          (msgId, data, token)  => post(`/messages/${msgId}/report`, data, token),
  getBlockedUsers:        (token)           => get('/messages/blocked', token),
  blockUser:              (userId, token)   => post(`/messages/block/${userId}`, {}, token),
  unblockUser:            (userId, token)   => del(`/messages/block/${userId}`, token),

  // Schools
  getSchools:             ()                => get('/schools'),
  createSchool:           (data, token)     => post('/schools', data, token),
  getSchool:              (id)              => get(`/schools/${id}`),
  updateSchool:           (id, data, token) => patch(`/schools/${id}`, data, token),
  getSchoolPosts:         (id, params)      => get(`/schools/${id}/posts${qs(params)}`),
  createSchoolPost:       (id, form, token) =>
    fetch(`${BASE}/schools/${id}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async res => {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      if (!res.ok) throw new Error(data.error || 'Post failed');
      return data;
    }),
  deleteSchoolPost:       (schoolId, postId, token) => del(`/schools/${schoolId}/posts/${postId}`, token),
  getSchoolLostFound:     ()                => get('/schools/lost-found/all'),

  // Atmospheric observations
  getAtmosphericObservations: (params)        => get(`/watch/atmospheric/observations${qs(params)}`),
  deleteAtmosphericObservation: (id, token)   => del(`/watch/atmospheric/observations/${id}`, token),
  submitAtmosphericObservation: (formData, token) =>
    fetch(`${BASE}/watch/atmospheric/observations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async res => {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      return data;
    }),

  // Weather modification permits
  getAtmosphericPermits:    ()                => get('/watch/atmospheric/permits'),
  createAtmosphericPermit:  (data, token)     => post('/watch/atmospheric/permits', data, token),
  updateAtmosphericPermit:  (id, data, token) => patch(`/watch/atmospheric/permits/${id}`, data, token),
  deleteAtmosphericPermit:  (id, token)       => del(`/watch/atmospheric/permits/${id}`, token),

  // Soil / rainwater samples
  getSoilSamples:   (params)          => get(`/watch/atmospheric/soil-samples${qs(params)}`),
  deleteSoilSample: (id, token)       => del(`/watch/atmospheric/soil-samples/${id}`, token),
  analyzeSoilSample:(id, token)       => post(`/watch/atmospheric/soil-samples/${id}/analyze`, {}, token),
  submitSoilSample: (formData, token) =>
    fetch(`${BASE}/watch/atmospheric/soil-samples`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async res => {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      return data;
    }),

  // Atmospheric FOIA tracker
  getAtmosphericFoia:    ()               => get('/watch/atmospheric/foia'),
  updateAtmosphericFoia: (id, data, token)=> patch(`/watch/atmospheric/foia/${id}`, data, token),

  // Watch
  getLandIntelReports:    (params)       => get(`/watch/land-intelligence/reports${qs(params)}`),
  triggerLandIntelligence:(token)        => post('/watch/land-intelligence/trigger', {}, token),
  // Land records (community submissions)
  getLandRecords:         (params)       => get(`/watch/land-intelligence/records${qs(params)}`),
  submitLandRecord:       (data, token)  => post('/watch/land-intelligence/records', data, token),
  verifyLandRecord:       (id, token)    => patch(`/watch/land-intelligence/records/${id}/verify`, {}, token),
  deleteLandRecord:       (id, token)    => del(`/watch/land-intelligence/records/${id}`, token),
  // Public Records Requests
  getPRR:                 ()             => get('/watch/land-intelligence/prr'),
  createPRR:              (data, token)  => post('/watch/land-intelligence/prr', data, token),
  updatePRR:              (id, d, token) => patch(`/watch/land-intelligence/prr/${id}`, d, token),
  deletePRR:              (id, token)    => del(`/watch/land-intelligence/prr/${id}`, token),
  getWatchReports:   (dashboard, params) => get(`/watch/${dashboard}/reports${qs(params)}`),
  getWatchAnomalies: (params)            => get(`/watch/anomalies${qs(params)}`),
  getAdminWatchAnomalies: (token)        => get('/admin/watch-anomalies', token),
  reviewAnomaly:     (id, token)         => patch(`/admin/watch-anomalies/${id}/review`, {}, token),
  deleteAnomaly:     (id, token)         => del(`/admin/watch-anomalies/${id}`, token),
  submitWatchReport: (dashboard, formData, token) =>
    fetch(`${BASE}/watch/${dashboard}/reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async res => {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      return data;
    }),
};
