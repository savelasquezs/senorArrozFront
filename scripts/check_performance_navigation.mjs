import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { gzipSync } from 'node:zlib'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const playwright = require(require.resolve('playwright', { paths: [process.env.PLAYWRIGHT_RUNTIME || 'C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }))
const [baseline, candidate, output = '../evidence/browser-performance.json', repeats = '20', replacement] = process.argv.slice(2)
if (!baseline || !candidate) throw new Error('Provide baseline and candidate build directories.')
const repetitions = Number(repeats)
const routesOnly = process.env.FRONT_PERF_ROUTES_ONLY === '1'
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
const servers = []
async function serve(directory) {
    let root = resolve(directory)
    const server = createServer(async (req, res) => {
        const path = new URL(req.url, 'http://localhost').pathname
        const file = resolve(root, '.' + decodeURIComponent(path))
        if (!file.startsWith(root)) { res.writeHead(403).end(); return }
        try {
            const extension = extname(file)
            const target = extension ? file : resolve(root, 'index.html')
            const data = await readFile(target)
            res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Content-Encoding': 'gzip', 'Cache-Control': extension ? 'public,max-age=31536000,immutable' : 'no-cache' })
            res.end(gzipSync(data))
        } catch { res.writeHead(404).end() }
    })
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    servers.push(server)
    server.changeRoot = directory => { root = resolve(directory) }
    return `http://127.0.0.1:${server.address().port}`
}
const user = { id: 1, name: 'Performance fixture', role: 'Admin', accountType: 'personal', email: 'fixture@example.invalid', phone: '3000000000', branchId: 1, branchName: 'Synthetic', active: true }
const timestamp = '2026-10-26T15:00:00Z'
const products = Array.from({ length: 180 }, (_, i) => ({ id: i + 1, categoryId: 1, categoryName: 'Arroces', branchId: 1, branchName: 'Synthetic', name: `Perf product ${String(i + 1).padStart(3, '0')}`, price: 15000, stock: null, active: true, inventoryEnabled: false, inventoryControlMode: 'estimated', createdAt: timestamp, updatedAt: timestamp }))
const customers = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, branchId: 1, branchName: 'Synthetic', name: `Perf customer ${String(i + 1).padStart(3, '0')}`, phone1: `300${String(i).padStart(7, '0')}`, active: true, createdAt: timestamp, updatedAt: timestamp, addressCount: 0, orderCount: 0, totalOrders: 0, totalSpent: 0, billingCompanies: [] }))
const response = data => ({ isSuccess: true, data, message: '' })
function paged(items, url) {
    const params = Object.fromEntries([...url.searchParams].map(([key, value]) => [key.toLowerCase(), value]))
    const search = (params.search || params.name || '').toLowerCase()
    const rows = search ? items.filter(item => item.name?.toLowerCase().includes(search)) : items
    const page = Number(params.page || 1), pageSize = Number(params.pagesize || 20)
    return { items: rows.slice((page - 1) * pageSize, page * pageSize), totalCount: rows.length, page, pageSize, totalPages: Math.ceil(rows.length / pageSize), hasPreviousPage: page > 1, hasNextPage: page * pageSize < rows.length }
}
function fixture(url) {
    const path = url.pathname.toLowerCase().replace(/^\/api/, '')
    if (path.includes('/hubs/')) return { connectionId: 'fixture', connectionToken: 'fixture', availableTransports: [] }
    if (path === '/employee-lunch/me') return { userId: 1, name: user.name, role: user.role, activeLunch: null, lunches: [], serverTimeUtc: new Date().toISOString() }
    if (path.includes('/employee-leaves/summary')) return { unread: 0, pendingReview: 0 }
    if (path.includes('/employee-leaves/kinds')) return []
    if (path === '/products') return response(paged(products, url))
    if (path === '/productcategories') return response(paged([{ id: 1, name: 'Arroces', branchId: 1, productCount: 180, active: true }], url))
    if (path === '/customers') return response(paged(customers, url))
    if (path === '/customers/neighborhoods') return response([])
    if (path === '/business-documents') return response(paged([], url))
    if (path === '/banks' || path === '/apps') return paged([], url)
    if (path === '/orders/search' || path === '/orders/delivery/ready') return paged([], url)
    if (path === '/orders/deliveryman-options' || path === '/orders/remote-branches') return []
    if (path.includes('daily-promotion') && path.endsWith('/active')) return response(null)
    if (path === '/integrations/apps/status') return response({ rappi: null, pending: 0 })
    if (path.includes('whatsapp') && path.endsWith('/status')) return response({ enabled: false, branchIds: [], connected: false })
    if (path === '/inventory/availability') return []
    if (path === '/branches') return response(paged([{ id: 1, name: 'Synthetic', isActive: true }], url))
    if (path === '/branches/1') return response({ id: 1, name: 'Synthetic', isActive: true, users: [], neighborhoods: [], maxFreeDeliveryDiscount: 3000 })
    return response([])
}
function summary(values) {
    const sorted = [...values].sort((a, b) => a - b)
    return { repetitions: values.length, medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)], samplesMs: values }
}
const browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' })
const report = { layer: 'Synthetic API fixture, local compressed production builds, Chromium headless; not production UX measurements', apiDelayMs: 150, repetitions, results: {} }
let activePage
try {
    for (const [name, directory] of [['baseline', baseline], ['candidate', candidate]]) {
        if (routesOnly && name === 'baseline') continue
        const origin = await serve(directory)
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' })
        const requests = [], errors = [], unknown = new Set()
        await context.addInitScript(({ user }) => {
            if (['/login', '/forgot-password', '/reset-password'].includes(location.pathname)) {
                localStorage.removeItem('auth_token'); localStorage.removeItem('refresh_token'); localStorage.removeItem('user_data'); return
            }
            const encode = value => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
            localStorage.setItem('auth_token', `${encode({ alg: 'none' })}.${encode({ sub: '1', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`)
            localStorage.setItem('refresh_token', 'synthetic-refresh')
            localStorage.setItem('user_data', JSON.stringify(user))
            const intervals = new Set(), set = window.setInterval.bind(window), clear = window.clearInterval.bind(window)
            window.setInterval = (...args) => { const id = set(...args); intervals.add(id); return id }
            window.clearInterval = id => { intervals.delete(id); return clear(id) }
            window.__perf = { intervals, longTasks: [] }
            new PerformanceObserver(list => { window.__perf.longTasks.push(...list.getEntries().map(item => item.duration)) }).observe({ type: 'longtask', buffered: true })
        }, { user: routesOnly ? { ...user, role: 'Superadmin' } : user })
        await context.route('**/*', async route => {
            const url = new URL(route.request().url())
            if (url.origin === origin) return route.continue()
            requests.push({ path: url.pathname, method: route.request().method() })
            if (!url.pathname.startsWith('/api') && !url.pathname.includes('/hubs/')) unknown.add(url.origin + url.pathname)
            await new Promise(r => setTimeout(r, 150))
            if (routesOnly && !url.pathname.includes('/hubs/') && !['/api/employee-lunch/me', '/api/products', '/api/customers', '/api/customers/neighborhoods', '/api/productcategories', '/api/banks', '/api/apps', '/api/branches', '/api/integrations/apps/status'].includes(url.pathname)
                && !url.pathname.endsWith('/daily-promotion/active') && !url.pathname.endsWith('/whatsapp/status')) {
                try { await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ isSuccess: false, data: null, message: 'Synthetic unavailable service' }) }) } catch {}
                return
            }
            try { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture(url)) }) } catch {}
        })
        const page = await context.newPage()
        activePage = page
        page.on('pageerror', error => errors.push(error.message))
        if (routesOnly) {
            const source = await readFile('src/router/index.ts', 'utf8')
            const routes = [...source.matchAll(/page\('([^']+)', '([^']+)'/g)].map(match => ({ path: match[1], name: match[2] }))
            report.routeSmoke = []
            for (const route of routes) {
                const path = route.path.replace(':publicId', '98e08165-42a1-42d9-a7dc-79e695207f74').replace(':id', '1')
                const initialErrors = errors.length
                await page.goto(origin + path)
                await page.waitForTimeout(900)
                const state = await page.evaluate(() => ({ textLength: document.body.innerText.trim().length, path: location.pathname, mainRegions: document.querySelectorAll('main').length }))
                report.routeSmoke.push({ ...route, landed: state.path, textLength: state.textLength, errors: errors.slice(initialErrors) })
                console.log(route.name, state.path, JSON.stringify(errors.slice(initialErrors)))
            }
            await writeFile(output, JSON.stringify(report, null, 2))
            await context.close()
            assert(report.routeSmoke.every(route => route.textLength > 30 && route.errors.length === 0), 'Initial route/error-state smoke found unhandled exceptions; inspect report.')
            continue
        }
        const cold = []
        for (let index = 0; index < repetitions; index++) {
            const session = await context.newCDPSession(page)
            await session.send('Network.clearBrowserCache')
            await session.detach()
            const start = performance.now()
            await page.goto(origin + '/products')
            await page.getByText('Perf product 001', { exact: true }).first().waitFor({ state: 'visible', timeout: 20000 })
            cold.push(performance.now() - start)
        }
        const warm = []
        async function navigate(path, marker) {
            const start = performance.now()
            await page.locator('header button[type="button"]').first().click()
            const link = page.locator(`nav a[href="${path}"]`).first()
            await link.click()
            await page.getByText(marker, { exact: true }).first().waitFor({ state: 'visible' })
            warm.push(performance.now() - start)
        }
        await navigate('/customers', 'Perf customer 001')
        const before = await page.evaluate(() => ({ intervals: window.__perf.intervals.size, heap: performance.memory?.usedJSHeapSize ?? null }))
        const beforeRequests = requests.length
        for (let index = 0; index < repetitions; index++) {
            await navigate('/products', 'Perf product 001')
            await navigate('/customers', 'Perf customer 001')
        }
        const lifecycle = await page.evaluate(() => ({ intervals: window.__perf.intervals.size, heap: performance.memory?.usedJSHeapSize ?? null, headers: document.querySelectorAll('header').length, mainRegions: document.querySelectorAll('main').length, longTasks: window.__perf.longTasks }))
        const cycleRequests = requests.slice(beforeRequests)
        const warmMeasurement = summary(warm.slice(1))
        const counts = Object.fromEntries([...new Set(cycleRequests.map(item => item.path))].map(path => [path, cycleRequests.filter(item => item.path === path).length]))
        if (name === 'candidate') {
            assert.equal(lifecycle.mainRegions, 1)
            assert.equal(lifecycle.intervals, before.intervals, 'Navigation leaked recurring timers')
            assert(!cycleRequests.some(item => item.path.includes('daily-promotion') && item.path.endsWith('/active')), 'Navigation reloaded the active promotion')
            const search = page.locator('input[placeholder="Nombre, empresa, NIT, teléfono o @usuario…"]')
            await search.fill('Perf customer 002')
            await page.getByRole('button', { name: 'Buscar', exact: true }).click()
            await page.getByText('Perf customer 002', { exact: true }).first().waitFor({ state: 'visible' })
            await navigate('/products', 'Perf product 001')
            await navigate('/customers', 'Perf customer 002')
            assert.equal(await search.inputValue(), 'Perf customer 002')
            report.viewState = { customerSearchSurvivesNavigation: true }
        }
        await page.setViewportSize({ width: 390, height: 844 })
        await page.waitForTimeout(350)
        const mobile = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
            overflow: [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(element => ({ tag: element.tagName, class: element.className, text: element.textContent.slice(0, 80), right: element.getBoundingClientRect().right })) }))
        report.results[name] = { coldProducts: summary(cold), warmNavigation: warmMeasurement, cycleRequestCounts: counts, before, lifecycle, mobile, pageErrors: [...new Set(errors)], unclassifiedExternalResources: [...unknown] }
        await mkdir(resolve(output, '..'), { recursive: true })
        await page.screenshot({ path: resolve(output, '..', `${name}-customers-mobile.png`), fullPage: true })
        await writeFile(output, JSON.stringify(report, null, 2))
        if (name === 'candidate') assert(mobile.width <= mobile.viewport, `Mobile horizontal overflow: ${JSON.stringify(mobile)}`)
        if (name === 'candidate' && replacement) {
            await page.setViewportSize({ width: 1440, height: 1000 })
            const draft = JSON.stringify({ draftOrders: [{ tabId: 'recovery-draft', tabName: 'Recovery', branchId: 1, workspaceBranchId: 1, type: 'delivery', orderItems: [], bankPayments: [], appPayment: null, subtotal: 0, total: 0, discountTotal: 0, deliveryFee: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }], currentTabId: 'recovery-draft', nextTabNumber: 2, lastSaved: new Date().toISOString() })
            await page.evaluate(draft => localStorage.setItem('senor-arroz-draft-orders', draft), draft)
            servers.at(-1).changeRoot(replacement)
            await page.locator('header button[type="button"]').first().click()
            await page.locator('nav a[href="/documents"]').first().click()
            await page.getByText('No se pudo abrir la pantalla', { exact: true }).waitFor()
            assert.equal(await page.evaluate(() => localStorage.getItem('senor-arroz-draft-orders')), draft)
            await context.setOffline(true)
            await page.waitForFunction(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Recargar y abrir')?.disabled === true)
            await context.setOffline(false)
            await Promise.all([page.waitForURL('**/documents'), page.getByRole('button', { name: 'Recargar y abrir', exact: true }).click()])
            await page.getByRole('heading', { name: 'Documentos corporativos', exact: true }).waitFor()
            assert.equal(await page.evaluate(() => localStorage.getItem('senor-arroz-draft-orders')), draft)
            report.recovery = { oldChunk404: true, explicitReload: true, offlineReloadDisabled: true, target: '/documents', draftPreserved: true }
        }
        await context.close()
        console.log(name, JSON.stringify({ coldMedian: report.results[name].coldProducts.medianMs, warmMedian: report.results[name].warmNavigation.medianMs, intervals: lifecycle.intervals, errors: report.results[name].pageErrors }))
    }
    await writeFile(output, JSON.stringify(report, null, 2))
} catch (error) {
    report.failure = { message: error.message, url: activePage?.url(), state: await activePage?.evaluate(() => ({ text: document.body.innerText.slice(0, 2000), buttons: [...document.querySelectorAll('header button')].map(element => ({ text: element.innerText, x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y })) })).catch(() => null) }
    await mkdir(resolve(output, '..'), { recursive: true })
    await activePage?.screenshot({ path: resolve(output, '..', 'performance-failure.png'), fullPage: true }).catch(() => {})
    await writeFile(output, JSON.stringify(report, null, 2))
    throw error
} finally {
    await browser.close()
    await Promise.all(servers.map(server => new Promise(r => server.close(r))))
}
