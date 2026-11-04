import axios from 'axios'
//const BASE_URL = "https://api.ghadafdal.dz/api";
const BASE_URL = "http://localhost:8000/api";
//const BASE_URL = "http://192.168.1.11:8000/api";
const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Auto-inject JWT token on every request
client.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// Auto-refresh access token on 401 using the refresh token
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

client.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config

    if (
      err.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh/') &&
      !originalRequest.url?.includes('/auth/login/')
    ) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        delete client.defaults.headers.common['Authorization']
        window.location.reload()
        return Promise.reject(err)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`
          return client(originalRequest)
        }).catch(e => Promise.reject(e))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // ✅ Fixed: properly appends the path to the base URL
        const res = await axios.post(
          `${BASE_URL}/auth/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        )

        const newAccess = res.data.access
        localStorage.setItem('access_token', newAccess)

        if (res.data.refresh) {
          localStorage.setItem('refresh_token', res.data.refresh)
        }

        client.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`
        processQueue(null, newAccess)
        originalRequest.headers['Authorization'] = `Bearer ${newAccess}`
        return client(originalRequest)

      } catch (refreshErr) {
        processQueue(refreshErr, null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        delete client.defaults.headers.common['Authorization']
        window.location.reload()
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

export default client