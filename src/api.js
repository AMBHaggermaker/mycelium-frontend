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
  createPost:      (data, token)       => post('/posts', data, token),
  updatePost:      (id, data, token)  => patch(`/posts/${id}`, data, token),
  deletePost:      (id, token)        => del(`/posts/${id}`, token),
  getMyPosts:      (token)            => get('/posts/my-posts', token),
  completePost:    (id, token)        => patch(`/posts/${id}/complete`, {}, token),
  extendPostExpiry:(id, expires_at, token) => patch(`/posts/${id}/extend`, { expires_at }, token),

  // Circles
  getCircles:     (params)            => get(`/circles${qs(params)}`),
  getCircle:      (id)                => get(`/circles/${id}`),
  createCircle:   (data, token)       => post('/circles', data, token),
  joinCircle:     (id, token)         => post(`/circles/${id}/join`, {}, token),
  leaveCircle:    (id, token)         => del(`/circles/${id}/leave`, token),
  getCircleMembers: (id)              => get(`/circles/${id}/members`),
  getCirclePosts: (id, params)        => get(`/circles/${id}/posts${qs(params)}`),
  getCircleThreads: (id)              => get(`/circles/${id}/threads`),

  // Profiles (by username)
  getProfile:         (username)          => get(`/profiles/${username}`),
  customizeProfile:   (data, token)       => patch('/profiles/customize', data, token),
  uploadProfilePhoto: (file, opts, token) => {
    const form = new FormData();
    form.append('photo', file);
    if (opts?.caption)          form.append('caption', opts.caption);
    if (opts?.album_name)       form.append('album_name', opts.album_name);
    if (opts?.is_profile_photo) form.append('is_profile_photo', 'true');
    return fetch(`${BASE}/profiles/upload-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async res => {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  },
  uploadProfileBanner: (file, token) => {
    const form = new FormData();
    form.append('banner', file);
    return fetch(`${BASE}/profiles/upload-banner`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async res => {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  },
  deleteProfilePhoto: (photoId, token)   => del(`/profiles/photos/${photoId}`, token),
  getWall:            (username)          => get(`/profiles/${username}/wall`),
  postOnWall: (username, formData, token) => {
    return fetch(`${BASE}/profiles/${username}/wall`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); return d; });
  },
  pinWallPost:        (username, postId, token) => patch(`/profiles/${username}/wall/${postId}/pin`, {}, token),
  deleteWallPost:     (username, postId, token) => del(`/profiles/${username}/wall/${postId}`, token),
  getWallThreads:     (wallPostId)        => get(`/threads?wall_post_id=${wallPostId}`),

  // Covenant
  agreeToCovenant:    (token)             => request('PATCH', '/users/me/covenant', {}, token),

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

  // RSVPs
  getRsvp:        (postId, token)          => get(`/posts/${postId}/rsvp`, token),
  setRsvp:        (postId, status, token)  => post(`/posts/${postId}/rsvp`, { status }, token),
  removeRsvp:     (postId, token)          => del(`/posts/${postId}/rsvp`, token),

  // Profile boards
  getProfileBoards:  (username, token)     => get(`/profiles/${username}/boards`, token),
  saveBoardSettings: (boards, token)       => patch('/profiles/boards/settings', { boards }, token),

  // Activity
  getTodayActivity: ()                     => get('/activity/today'),

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
  getAdminUsers:         (token)              => get('/admin/users', token),
  getAdminUserProfile:   (userId, token)      => get(`/admin/users/${userId}/profile`, token),
  setUserRole:          (userId, role, token)  => patch(`/admin/users/${userId}/role`, { role }, token),
  setFoundingMember:       (userId, grant, token) => patch(`/admin/users/${userId}/founding-member`, { grant }, token),
  adminMarkCovenantAgreed: (userId, token)        => patch(`/admin/users/${userId}/covenant-agreed`, {}, token),
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
  getDMThread:            (userId, token)   => get(`/messages/${userId}`, token),
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
  getWatchReports:    (dashboard, params) => get(`/watch/${dashboard}/reports${qs(params)}`),
  getAllWatchReports:  (params)           => get(`/watch/all-reports${qs(params)}`),
  getWatchAnomalies: (params)            => get(`/watch/anomalies${qs(params)}`),
  // Homeschool
  getHomeschoolGroups: ()               => get('/circles?circle_type=homeschool_circle&limit=60'),
  getHomeschoolChats:  ()               => get('/chat/rooms'),

  // Businesses
  getBusinesses:                (params)            => get(`/businesses${qs(params)}`),
  getRecentlyRecommendedBusinesses: ()              => get('/businesses/recently-recommended'),
  getBusiness:                  (id)                => get(`/businesses/${id}`),
  getBusinessesByOwner:         (userId)            => get(`/businesses/owner/${userId}`),
  createBusiness:               (data, token)       => post('/businesses', data, token),
  updateBusiness:               (id, data, token)   => patch(`/businesses/${id}`, data, token),
  deleteBusiness:               (id, token)         => del(`/businesses/${id}`, token),
  uploadBusinessPhoto:          (id, file, opts, token) => {
    const form = new FormData();
    form.append('photo', file);
    if (opts?.is_cover)   form.append('is_cover', 'true');
    if (opts?.caption)    form.append('caption', opts.caption);
    return fetch(`${BASE}/businesses/${id}/photos`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
    }).then(async res => {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  },
  deleteBusinessPhoto:          (id, photoId, token) => del(`/businesses/${id}/photos/${photoId}`, token),
  addBusinessService:           (id, data, token)   => post(`/businesses/${id}/services`, data, token),
  deleteBusinessService:        (id, svcId, token)  => del(`/businesses/${id}/services/${svcId}`, token),
  getBusinessRecommendations:   (id)                => get(`/businesses/${id}/recommendations`),
  postRecommendation:           (id, content, token) => post(`/businesses/${id}/recommendations`, { content }, token),
  replyToRecommendation:        (id, msgId, content, token) => post(`/businesses/${id}/recommendations/${msgId}/reply`, { content }, token),
  adminDeleteRecommendation:    (id, msgId, token)  => del(`/businesses/${id}/recommendations/${msgId}`, token),
  adminVerifyBusiness:          (id, verified, token) => patch(`/admin/businesses/${id}/verify`, { verified }, token),
  adminDeactivateBusiness:      (id, token)          => patch(`/admin/businesses/${id}/deactivate`, {}, token),
  getAdminBusinesses:           (token, showDeleted) => get(`/admin/businesses${showDeleted ? '?show_deleted=true' : ''}`, token),

  // Legislature
  getLegislationBills:          (p)           => get(`/legislature/bills${qs(p)}`),
  getLegislationReps:           (p)           => get(`/legislature/representatives${qs(p)}`),
  getLegislationRepDetail:      (id)          => get(`/legislature/representatives/${id}`),
  rateLegislationRep:           (id, data, token) => post(`/legislature/representatives/${id}/rate`, data, token),
  getLegislationAlerts:         (token)       => get('/legislature/alerts', token),
  addLegislationAlert:          (data, token) => post('/legislature/alerts', data, token),
  deleteLegislationAlert:       (id, token)   => del(`/legislature/alerts/${id}`, token),
  getLegislationCommunityRecords: (p)         => get(`/legislature/community-records${qs(p)}`),
  submitCommunityVoteRecord:    (data, token) => post('/legislature/community-records', data, token),
  createLegislationBill:        (data, token) => post('/legislature/bills', data, token),
  triggerBillAiSummary:         (id, token)   => post(`/legislature/bills/${id}/ai-summary`, {}, token),
  createLegislationRep:         (data, token) => post('/legislature/representatives', data, token),

  // Professional profiles
  getProfessionalProfile:       (username)          => get(`/profiles/${username}/professional`),
  updateProfessionalProfile:    (data, token)       => patch('/profiles/professional', data, token),
  endorseSkill:                 (endorsed_username, skill, token) => post('/profiles/endorse', { endorsed_username, skill }, token),
  removeEndorsement:            (endorsedId, skill, token) => del(`/profiles/endorse/${endorsedId}/${encodeURIComponent(skill)}`, token),

  // Feedback
  submitFeedback: (formData, token) => fetch(`${BASE}/feedback`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then(async res => {
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Failed');
    return d;
  }),
  getAdminFeedback:  (token)           => get('/feedback', token),
  updateFeedback:    (id, data, token) => patch(`/feedback/${id}`, data, token),
  deleteFeedback:    (id, token)       => del(`/feedback/${id}`, token),
  uploadProfileBackground: (file, token) => {
    const fd = new FormData(); fd.append('background', file);
    return fetch(`${BASE}/profiles/upload-background`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; });
  },
  uploadProfileSticker: (file, token) => {
    const fd = new FormData(); fd.append('sticker', file);
    return fetch(`${BASE}/profiles/upload-sticker`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; });
  },

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

  // Donations
  createDonationSession: (amount) => post('/donations/create-session', { amount }),
};
