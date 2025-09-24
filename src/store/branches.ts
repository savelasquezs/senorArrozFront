import { defineStore } from 'pinia';
import { ref } from 'vue';
import { branchApi } from '@/services/MainAPI/branchApi';
import type { Branch, BranchFilters, PagedResult } from '@/types/common';

export const useBranchesStore = defineStore('branches', () => {
	const list = ref<PagedResult<Branch> | null>(null);
	const current = ref<Branch | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	const fetchAll = async (filters?: Partial<BranchFilters>) => {
		try {
			isLoading.value = true;
			error.value = null;
			const res = await branchApi.getAllBranches(filters);
			list.value = res.data;
		} catch (err: any) {
			error.value = err.message || 'Error al cargar sucursales';
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	const fetch = async (filters?: BranchFilters) => {
		try {
			isLoading.value = true;
			error.value = null;
			const res = await branchApi.getBranches(filters);
			list.value = res.data;
		} catch (err: any) {
			error.value = err.message || 'Error al cargar sucursales';
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	const fetchById = async (id: number) => {
		try {
			isLoading.value = true;
			error.value = null;
			const res = await branchApi.getBranchById(id);
			current.value = res.data;
		} catch (err: any) {
			error.value = err.message || 'Error al cargar la sucursal';
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	const create = async (
		payload: Pick<Branch, 'name' | 'address' | 'phone1' | 'phone2'>
	) => {
		try {
			isLoading.value = true;
			error.value = null;
			const res = await branchApi.createBranch(payload);
			return res.data;
		} catch (err: any) {
			error.value = err.message || 'Error al crear la sucursal';
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	const update = async (
		id: number,
		payload: Pick<Branch, 'name' | 'address' | 'phone1' | 'phone2'>
	) => {
		try {
			isLoading.value = true;
			error.value = null;
			const res = await branchApi.updateBranch(id, payload);
			current.value = res.data;
			return res.data;
		} catch (err: any) {
			error.value = err.message || 'Error al actualizar la sucursal';
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	const remove = async (id: number) => {
		try {
			isLoading.value = true;
			error.value = null;
			await branchApi.deleteBranch(id);
		} catch (err: any) {
			error.value = err.message || 'Error al eliminar la sucursal';
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	const clear = () => {
		current.value = null;
		error.value = null;
	};

	return {
		list,
		current,
		isLoading,
		error,
		fetchAll,
		fetch,
		fetchById,
		create,
		update,
		remove,
		clear,
	};
});
