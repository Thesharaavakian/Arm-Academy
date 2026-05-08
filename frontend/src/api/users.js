import api from './client'

export const usersApi = {
  profile:        ()         => api.get('/users/profile/'),
  updateProfile:  (data)     => api.patch('/users/profile/',          data),
  uploadAvatar:   (formData) => api.post('/users/upload_avatar/',     formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  get:            (id)       => api.get(`/users/${id}/`),
  courses:        (id)       => api.get(`/users/${id}/courses/`),
  reviews:        (id)       => api.get(`/users/${id}/reviews/`),
  featuredTutors: ()         => api.get('/users/featured_tutors/'),
  siteStats:      ()         => api.get('/users/site_stats/'),
}

export const progressApi = {
  list: () => api.get('/progress/'),
  get:  (id) => api.get(`/progress/${id}/`),
}

export const certificatesApi = {
  list: () => api.get('/certificates/'),
}
