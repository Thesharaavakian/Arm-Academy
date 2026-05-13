import api from './client'

export const authApi = {
  login:          (username, password)     => api.post('/auth/login/',            { username, password }),
  register:       (data)                   => api.post('/auth/register/',          data),
  logout:         (refresh)                => api.post('/auth/logout/',            { refresh }),
  refresh:        (refresh)                => api.post('/auth/refresh/',           { refresh }),
  verifyToken:    (token)                  => api.post('/auth/verify-token/',      { token }),

  // Email verification
  verifyEmail:    (email, code)            => api.post('/auth/verify-email/',      { email, code }),
  resendEmailOTP: (email)                  => api.post('/auth/resend-email-otp/',  { email }),

  // 2FA
  verify2fa:      (temp_token, code)       => api.post('/auth/verify-2fa/',        { temp_token, code }),
  get2faSetup:    ()                       => api.get('/auth/setup-2fa/'),
  confirm2fa:     (code)                   => api.post('/auth/setup-2fa/',         { code }),
  disable2fa:     (code)                   => api.delete('/auth/setup-2fa/',       { data: { code } }),

  // Phone
  sendPhoneOTP:   (phone_number)           => api.post('/auth/send-phone-otp/',    { phone_number }),
  verifyPhone:    (code)                   => api.post('/auth/verify-phone/',      { code }),

  // Password reset
  forgotPassword: (email)                  => api.post('/auth/forgot-password/',   { email }),
  resetPassword:  (email, code, new_password) => api.post('/auth/reset-password/', { email, code, new_password }),
}
