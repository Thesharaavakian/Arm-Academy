import api from './client'

export const usersApi = {
  profile: () => api.get('/users/profile/'),
  updateProfile: (data) => api.patch('/users/profile/', data),
  get: (id) => api.get(`/users/${id}/`),
  courses: (id) => api.get(`/users/${id}/courses/`),
  reviews: (id) => api.get(`/users/${id}/reviews/`),
}

export const progressApi = {
  list: () => api.get('/progress/'),
  get: (id) => api.get(`/progress/${id}/`),
}

export const certificatesApi = {
  list: () => api.get('/certificates/'),
}
