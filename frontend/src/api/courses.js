import api from './client'

export const coursesApi = {
  list:      (params)       => api.get('/courses/',                 { params }),
  get:       (id)           => api.get(`/courses/${id}/`),
  create:    (data)         => api.post('/courses/', data),
  update:    (id, data)     => api.patch(`/courses/${id}/`,         data),
  delete:    (id)           => api.delete(`/courses/${id}/`),
  featured:  ()             => api.get('/courses/featured/'),
  myCourses: ()             => api.get('/courses/my_courses/'),
  publish:   (id)           => api.post(`/courses/${id}/publish/`),
  unpublish: (id)           => api.post(`/courses/${id}/unpublish/`),
  enroll:    (id)           => api.post(`/courses/${id}/enroll/`),
  unenroll:  (id)           => api.post(`/courses/${id}/unenroll/`),
  classes:   (id)           => api.get(`/courses/${id}/classes/`),
  sections:  (id)           => api.get(`/courses/${id}/sections/`),
  reviews:   (id)           => api.get(`/courses/${id}/reviews/`),
}

export const classesApi = {
  list:       (params)      => api.get('/classes/',                 { params }),
  get:        (id)          => api.get(`/classes/${id}/`),
  create:     (data)        => api.post('/classes/', data),
  update:     (id, data)    => api.patch(`/classes/${id}/`,         data),
  delete:     (id)          => api.delete(`/classes/${id}/`),
  attendance: (id, s)       => api.post(`/classes/${id}/attendance/`, { status: s }),
  chat:       (id)          => api.get(`/classes/${id}/chat/`),
  chatPost:   (id, content) => api.post(`/classes/${id}/chat_post/`, { content }),
}

export const reviewsApi = {
  create: (data)            => api.post('/reviews/', data),
  update: (id, data)        => api.patch(`/reviews/${id}/`, data),
  delete: (id)              => api.delete(`/reviews/${id}/`),
  helpful: (id)             => api.post(`/reviews/${id}/mark_helpful/`),
}
