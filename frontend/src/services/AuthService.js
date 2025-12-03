import axios from 'axios'

const API_URL = 'http://localhost:8000/api/auth'

class AuthService {
    constructor() {
        this.accessToken = localStorage.getItem('access_token')
        this.refreshToken = localStorage.getItem('refresh_token')
    }

    async register(email, username, password) {
        try {
            const response = await axios.post(`${API_URL}/register`, {
                email,
                username,
                password
            })
            return { success: true, data: response.data }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || 'Registration failed'
            }
        }
    }

    async login(email, password) {
        try {
            const response = await axios.post(`${API_URL}/login`, {
                email,
                password
            })

            const { access_token, refresh_token } = response.data

            // Store tokens
            localStorage.setItem('access_token', access_token)
            localStorage.setItem('refresh_token', refresh_token)

            this.accessToken = access_token
            this.refreshToken = refresh_token

            return { success: true, data: response.data }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || 'Login failed'
            }
        }
    }

    async refreshAccessToken() {
        try {
            const refreshToken = localStorage.getItem('refresh_token')
            if (!refreshToken) {
                throw new Error('No refresh token available')
            }

            const response = await axios.post(`${API_URL}/refresh`, {
                refresh_token: refreshToken
            })

            const { access_token, refresh_token: new_refresh_token } = response.data

            // Update tokens
            localStorage.setItem('access_token', access_token)
            localStorage.setItem('refresh_token', new_refresh_token)

            this.accessToken = access_token
            this.refreshToken = new_refresh_token

            return { success: true }
        } catch (error) {
            // If refresh fails, logout
            this.logout()
            return { success: false }
        }
    }

    async getCurrentUser() {
        try {
            const token = localStorage.getItem('access_token')
            if (!token) {
                return { success: false, error: 'Not authenticated' }
            }

            const response = await axios.get(`${API_URL}/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            return { success: true, data: response.data }
        } catch (error) {
            // If token expired, try to refresh
            if (error.response?.status === 401) {
                const refreshResult = await this.refreshAccessToken()
                if (refreshResult.success) {
                    // Retry with new token
                    return this.getCurrentUser()
                }
            }
            return {
                success: false,
                error: error.response?.data?.detail || 'Failed to get user'
            }
        }
    }

    logout() {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        this.accessToken = null
        this.refreshToken = null
    }

    isAuthenticated() {
        return !!localStorage.getItem('access_token')
    }

    getAccessToken() {
        return localStorage.getItem('access_token')
    }
}

export default new AuthService()
