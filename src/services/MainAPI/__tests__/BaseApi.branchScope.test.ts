import { beforeEach, describe, expect, it } from 'vitest'
import type { AxiosRequestConfig } from 'axios'
import { BaseApi, type BranchScope } from '../BaseApi'
import { setSelectedBranchIdForRequest } from '@/services/branchContextSession'
import { UserRole, type User } from '@/types/auth'

class ProbeApi extends BaseApi {
    probe(branchScope?: BranchScope) {
        const config: AxiosRequestConfig = {
            branchScope,
            adapter: async request => ({
                data: {
                    branchHeader: request.headers?.get('X-Branch-Id') ?? null,
                },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: request,
            }),
        }
        return this.get<{ branchHeader: string | null }>('/probe', config)
    }
}

const user: User = {
    id: 1,
    name: 'Super',
    email: 'super@example.com',
    phone: '3000000000',
    active: true,
    role: UserRole.SUPERADMIN,
    branchId: 1,
    branchName: 'Santander',
}

describe('BaseApi branch scope', () => {
    beforeEach(() => {
        localStorage.setItem('user_data', JSON.stringify(user))
        setSelectedBranchIdForRequest(2)
    })

    it('injects the selected branch by default', async () => {
        const response = await new ProbeApi().probe()

        expect(response.branchHeader).toBe('2')
    })

    it.each<BranchScope>(['all', 'none'])('omits the header for %s scope', async scope => {
        const response = await new ProbeApi().probe(scope)

        expect(response.branchHeader).toBeNull()
    })

    it('never injects the selector for non-superadmin users', async () => {
        localStorage.setItem('user_data', JSON.stringify({ ...user, role: UserRole.ADMIN }))

        const response = await new ProbeApi().probe()

        expect(response.branchHeader).toBeNull()
    })
})
