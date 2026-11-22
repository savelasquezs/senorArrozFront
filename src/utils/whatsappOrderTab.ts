import type { User } from '@/types/auth'
import { generatePosCreationKey } from '@/utils/posCreationKey'

const channelName = 'senor-arroz:whatsapp-order'
const tabNamePrefix = 'senor-arroz:whatsapp:'
const discoveryMs = 200
const activationMs = 350
const acknowledgementMs = 100

type TabRequest = { scope: string; requestId: string }
type OrderIntent = TabRequest & { tabId: string; orderId: number; expiresAt: number }
type TabOffer = TabRequest & { type: 'offer'; tabId: string; lastFocused: number; activation?: true; tabName?: string }
type TabMessage =
    | (TabRequest & { type: 'discover' })
    | TabOffer
    | (OrderIntent & { type: 'activate' | 'open' })
    | (TabRequest & { type: 'accepted'; tabId: string })

type Handoff = 'reused' | 'unfocused' | 'absent'
type WhatsAppOrderLaunch = 'reused' | 'opened' | 'navigate' | 'ignored'

export function whatsAppOrderTabScope(user: User | null, branchId?: number | null): string | null {
    return user ? JSON.stringify([user.id, user.role, user.accountType, branchId ?? user.branchId]) : null
}

function connect() {
    try { return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(channelName) }
    catch { return null }
}

function tryFocus(target: Window) {
    try { target.focus() } catch { /* The browser may decline to focus another tab. */ }
}

export function listenForWhatsAppOrders(getScope: () => string | null, open: (orderId: number) => void) {
    const channel = connect()
    if (!channel) return () => {}
    const tabId = generatePosCreationKey()
    const tabName = window.name.startsWith(tabNamePrefix) ? window.name : undefined
    const isForeground = () => document.visibilityState === 'visible' && document.hasFocus()
    let lastFocused = isForeground() ? Date.now() : 0
    let lastRequest: string | undefined
    let activation: OrderIntent | undefined

    const accept = (intent: OrderIntent) => {
        if (lastRequest !== intent.requestId) {
            lastRequest = intent.requestId
            open(intent.orderId)
        }
        channel.postMessage({ type: 'accepted', scope: intent.scope, requestId: intent.requestId, tabId } satisfies TabMessage)
    }

    function acceptWhenFocused() {
        if (!activation) return
        if (Date.now() >= activation.expiresAt || activation.scope !== getScope()) {
            activation = undefined
            return
        }
        if (!isForeground()) return
        const intent = activation
        activation = undefined
        accept(intent)
    }

    const rememberFocus = () => {
        lastFocused = Date.now()
        acceptWhenFocused()
    }
    window.addEventListener('focus', rememberFocus)
    document.addEventListener('visibilitychange', acceptWhenFocused)
    channel.onmessage = ({ data }: MessageEvent<TabMessage>) => {
        const scope = getScope()
        if (!scope || data?.scope !== scope || typeof data.requestId !== 'string') return
        if (data.type === 'discover') {
            channel.postMessage({ type: 'offer', scope, requestId: data.requestId, tabId, lastFocused, activation: true, tabName } satisfies TabMessage)
        } else if ((data.type === 'activate' || data.type === 'open') && data.tabId === tabId && Date.now() < data.expiresAt
            && Number.isSafeInteger(data.orderId) && data.orderId > 0) {
            if (data.type === 'open') {
                // Orders tabs still running the previous build use the original handoff.
                accept(data)
                tryFocus(window)
            } else {
                activation = data
                if (!isForeground()) tryFocus(window)
                acceptWhenFocused()
            }
        }
    }
    return () => {
        window.removeEventListener('focus', rememberFocus)
        document.removeEventListener('visibilitychange', acceptWhenFocused)
        channel.close()
    }
}

function handOffOrder(channel: BroadcastChannel, scope: string, orderId: number, isCurrent: () => boolean,
    focusOpenedTab: (tabName?: string) => void): Promise<Handoff> {
    const requestId = generatePosCreationKey()
    return new Promise<Handoff>(resolve => {
        let bestOffer: TabOffer | undefined
        let foundTab = false
        let chosenTab: string | undefined
        let deliveryTimer: number | undefined
        channel.onmessage = ({ data }: MessageEvent<TabMessage>) => {
            if (data?.scope !== scope || data.requestId !== requestId) return
            if (data.type === 'offer' && typeof data.tabId === 'string' && Number.isFinite(data.lastFocused)) {
                foundTab = true
                if (data.activation && (!bestOffer || data.lastFocused > bestOffer.lastFocused)) bestOffer = data
            }
            if (data.type === 'accepted' && chosenTab === data.tabId) {
                window.clearTimeout(deliveryTimer)
                resolve('reused')
            }
        }
        window.setTimeout(() => {
            if (!bestOffer || !isCurrent()) { resolve(foundTab ? 'unfocused' : 'absent'); return }
            chosenTab = bestOffer.tabId
            focusOpenedTab(bestOffer.tabName)
            channel.postMessage({ type: 'activate', scope, requestId, tabId: chosenTab, orderId,
                expiresAt: Date.now() + activationMs } satisfies TabMessage)
            deliveryTimer = window.setTimeout(() => resolve('unfocused'), activationMs + acknowledgementMs)
        }, discoveryMs)
        channel.postMessage({ type: 'discover', scope, requestId } satisfies TabMessage)
    }).finally(() => channel.close())
}

function openWhatsAppTab(url: string) {
    const tab = window.open('about:blank', '_blank')
    if (!tab) return undefined
    const name = `${tabNamePrefix}${generatePosCreationKey()}`
    tab.opener = null
    tab.name = name
    tab.location.replace(url)
    return { tab, name }
}

export function createWhatsAppOrderLauncher() {
    let pending = false
    let openedTab: ReturnType<typeof openWhatsAppTab>
    return async (scope: string, orderId: number, url: string, isCurrent: () => boolean): Promise<WhatsAppOrderLaunch> => {
        if (pending) return 'ignored'
        pending = true
        try {
            const channel = connect()
            const handoff = channel ? await handOffOrder(channel, scope, orderId, isCurrent, tabName => {
                if (openedTab && openedTab.name === tabName && !openedTab.tab.closed) tryFocus(openedTab.tab)
            }) : 'absent'
            if (!isCurrent()) return 'ignored'
            if (handoff === 'reused') return 'reused'
            if (handoff === 'unfocused') return 'navigate'
            openedTab = openWhatsAppTab(url)
            return openedTab ? 'opened' : 'navigate'
        } finally {
            pending = false
        }
    }
}
