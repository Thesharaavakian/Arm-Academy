import api from './client'

export const authApi = {
  login: (email, password) =>
    api.post('/auth/login/', { username: email, password }),

  register: (data) => api.post('/auth/register/', data),

  logout: (refresh) => api.post('/auth/logout/', { refresh }),

  refresh: (refresh) => api.post('/auth/refresh/', { refresh }),

  verify: (token) => api.post('/auth/verify/', { token }),
}
