import axios from 'axios'
import type { LoginResponse, User } from '@/types/auth'
import { redirectToLogin } from './authNavigation'
import { WEB_CLIENT_HEADER, WEB_CLIENT_HEADER_VALUE } from '@/constants/deliveryApp'

const ACCESS_TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_DATA_KEY = 'user_data'
const DEFAULT_API_URL = 'http://localhost:8080/api'

type RefreshResponse = Pick<LoginResponse, 'token'> &
    Partial<Pick<LoginResponse, 'refreshToken' | 'user'>>

interface SessionSnapshot {
    token: string | null
    refreshToken: string | null
    user: User | null
}

let refreshPromise: Promise<string | null> | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null
const TOKEN_REFRESH_LEEWAY_SECONDS = 120

function getApiBaseUrl(): string {
    return import.meta.env.VITE_API_URL || DEFAULT_API_URL
}

function parseStoredUser(raw: string | null): User | null {
    if (!raw) {
        return null
    }

    try {
        return JSON.parse(raw) as User
    } catch {
        clearSession()
        return null
    }
}

export function getSessionSnapshot(): SessionSnapshot {
    return {
        token: localStorage.getItem(ACCESS_TOKEN_KEY),
        refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
        user: parseStoredUser(localStorage.getItem(USER_DATA_KEY)),
    }
}

export function getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function hasAccessToken(): boolean {
    return !!getAccessToken()
}

export function getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getStoredUser(): User | null {
    return parseStoredUser(localStorage.getItem(USER_DATA_KEY))
}

export function persistSession(data: LoginResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.token)
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user))
    scheduleTokenRefresh(data.token)
}

export function updateSessionTokens(data: RefreshResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.token)

    if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
    }

    if (data.user) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user))
    }

    scheduleTokenRefresh(data.token)
}

export function updateStoredUser(user: User): void {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
}

export function clearSession(): void {
    if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_DATA_KEY)
}

function readTokenExpiration(token: string | null): number | null {
    if (!token) return null
    try {
        const payload = token.split('.')[1]
        if (!payload) return null
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
        const decoded = JSON.parse(atob(normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=')))
        return typeof decoded.exp === 'number' ? decoded.exp : null
    } catch {
        return null
    }
}

function scheduleTokenRefresh(token: string | null): void {
    if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
    }

    const expiresAt = readTokenExpiration(token)
    if (!expiresAt) return

    const delay = Math.max(1000, (expiresAt - Math.floor(Date.now() / 1000) - TOKEN_REFRESH_LEEWAY_SECONDS) * 1000)
    refreshTimer = setTimeout(() => {
        refreshTimer = null
        void refreshAccessToken()
    }, delay)
}

export async function getValidAccessToken(): Promise<string | null> {
    const token = getAccessToken()
    const expiresAt = readTokenExpiration(token)
    if (!token || !expiresAt) return token

    if (expiresAt - Math.floor(Date.now() / 1000) <= TOKEN_REFRESH_LEEWAY_SECONDS) {
        return (await refreshAccessToken()) ?? token
    }

    return token
}

export async function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) {
        return refreshPromise
    }

    const refreshToken = getRefreshToken()
    const accessToken = getAccessToken()
    if (!refreshToken || !accessToken) {
        return null
    }

    // The API intentionally reads identity/session data from the expired access token
    // while validating the refresh token. Therefore refresh must send both tokens.
    const refreshClient = axios.create({
        baseURL: getApiBaseUrl(),
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            [WEB_CLIENT_HEADER]: WEB_CLIENT_HEADER_VALUE,
        },
    })

    refreshPromise = refreshClient
        .post<RefreshResponse>('/auth/refresh', { refreshToken })
        .then(({ data }) => {
            updateSessionTokens({
                token: data.token,
                refreshToken: data.refreshToken ?? refreshToken,
                user: data.user,
            })
            return data.token
        })
        .catch(() => {
            clearSession()
            redirectToLogin()
            return null
        })
        .finally(() => {
            refreshPromise = null
        })

    return refreshPromise
}

scheduleTokenRefresh(getAccessToken())
