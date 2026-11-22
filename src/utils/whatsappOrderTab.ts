import type { User } from '@/types/auth'
import { generatePosCreationKey } from '@/utils/posCreationKey'

const channelName = 'senor-arroz:whatsapp-order'
const discoveryMs = 200
const deliveryMs = 350

type TabMessage = { scope: string; requestId: string } & (
    | { type: 'discover' }
    | { type: 'offer'; tabId: string; lastFocused: number }
    | { type: 'open'; tabId: string; orderId: number; expiresAt: number }
    | { type: 'accepted'; tabId: string }
)

type WhatsAppOrderLaunch = 'reused' | 'opened' | 'blocked' | 'ignored'

export function whatsAppOrderTabScope(user: User | null, branchId?: number | null): string | null {
    return user ? JSON.stringify([user.id, user.role, user.accountType, branchId ?? user.branchId]) : null
}

function connect() {
    try { return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(channelName) }
    catch { return null }
}

export function listenForWhatsAppOrders(getScope: () => string | null, open: (orderId: number) => void) {
    const channel = connect()
    if (!channel) return () => {}
    const tabId = generatePosCreationKey()
    let lastFocused = document.visibilityState === 'visible' ? Date.now() : 0
    let lastRequest: string | undefined
    const rememberFocus = () => { lastFocused = Date.now() }
    window.addEventListener('focus', rememberFocus)
    channel.onmessage = ({ data }: MessageEvent<TabMessage>) => {
        const scope = getScope()
        if (!scope || data?.scope !== scope || typeof data.requestId !== 'string') return
        if (data.type === 'discover') {
            channel.postMessage({ type: 'offer', scope, requestId: data.requestId, tabId, lastFocused } satisfies TabMessage)
        } else if (data.type === 'open' && data.tabId === tabId && Date.now() <= data.expiresAt
            && Number.isSafeInteger(data.orderId) && data.orderId > 0) {
            if (lastRequest !== data.requestId) {
                lastRequest = data.requestId
                open(data.orderId)
                try { window.focus() } catch { /* Some browsers restrict focus from a background tab. */ }
            }
            channel.postMessage({ type: 'accepted', scope, requestId: data.requestId, tabId } satisfies TabMessage)
        }
    }
    return () => {
        window.removeEventListener('focus', rememberFocus)
        channel.close()
    }
}

function handOffOrder(channel: BroadcastChannel, scope: string, orderId: number): Promise<boolean> {
    const requestId = generatePosCreationKey()
    return new Promise<boolean>(resolve => {
        let bestOffer: Extract<TabMessage, { type: 'offer' }> | undefined
        let chosenTab: string | undefined
        let deliveryTimer: number | undefined
        channel.onmessage = ({ data }: MessageEvent<TabMessage>) => {
            if (data?.scope !== scope || data.requestId !== requestId) return
            if (data.type === 'offer' && typeof data.tabId === 'string' && Number.isFinite(data.lastFocused)
                && (!bestOffer || data.lastFocused > bestOffer.lastFocused)) bestOffer = data
            if (data.type === 'accepted' && chosenTab === data.tabId) {
                window.clearTimeout(deliveryTimer)
                resolve(true)
            }
        }
        window.setTimeout(() => {
            if (!bestOffer) { resolve(false); return }
            chosenTab = bestOffer.tabId
            channel.postMessage({ type: 'open', scope, requestId, tabId: chosenTab, orderId,
                expiresAt: Date.now() + deliveryMs } satisfies TabMessage)
            deliveryTimer = window.setTimeout(() => resolve(false), deliveryMs)
        }, discoveryMs)
        channel.postMessage({ type: 'discover', scope, requestId } satisfies TabMessage)
    }).finally(() => channel.close())
}

function openWhatsAppTab(url: string): boolean {
    const tab = window.open('about:blank', '_blank')
    if (!tab) return false
    tab.opener = null
    tab.location.replace(url)
    return true
}

export function createWhatsAppOrderLauncher() {
    let pending = false
    let blockedScope: string | undefined
    return async (scope: string, orderId: number, url: string, isCurrent: () => boolean): Promise<WhatsAppOrderLaunch> => {
        if (pending) return 'ignored'
        pending = true
        try {
            // Retain the gesture on a retry if the first browser refused to open after discovery.
            const channel = blockedScope === scope ? null : connect()
            const reused = channel && await handOffOrder(channel, scope, orderId)
            if (!isCurrent()) return 'ignored'
            if (reused) {
                blockedScope = undefined
                return 'reused'
            }
            const opened = openWhatsAppTab(url)
            blockedScope = opened ? undefined : scope
            return opened ? 'opened' : 'blocked'
        } finally {
            pending = false
        }
    }
}
