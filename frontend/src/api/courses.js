import api from './client'

export const coursesApi = {
  list: (params) => api.get('/courses/', { params }),
  get: (id) => api.get(`/courses/${id}/`),
  create: (data) => api.post('/courses/', data),
  update: (id, data) => api.patch(`/courses/${id}/`, data),
  delete: (id) => api.delete(`/courses/${id}/`),
  enroll: (id) => api.post(`/courses/${id}/enroll/`),
  unenroll: (id) => api.post(`/courses/${id}/unenroll/`),
  classes: (id) => api.get(`/courses/${id}/classes/`),
  reviews: (id) => api.get(`/courses/${id}/reviews/`),
}

export const classesApi = {
  list: (params) => api.get('/classes/', { params }),
  get: (id) => api.get(`/classes/${id}/`),
  attendance: (id, statusVal) => api.post(`/classes/${id}/attendance/`, { status: statusVal }),
  chat: (id) => api.get(`/classes/${id}/chat/`),
  chatPost: (id, content) => api.post(`/classes/${id}/chat_post/`, { content }),
}
