import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { branchApi } from '@/services/MainAPI/branchApi';
import type { Branch, BranchFilters, PagedResult } from '@/types/common';
import type { NeighborhoodFormData } from '@/types/customer';

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

	const currentUsers = computed(() => current.value?.users)
	const currentNeighborhoods = computed(() => current.value?.neighborhoods)

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

	// Neighborhood management functions
	const createNeighborhood = async (data: NeighborhoodFormData & { branchId: number }) => {
		try {
			isLoading.value = true;
			error.value = null;

			// Create neighborhood via API
			const res = await branchApi.createNeighborhood(data);
			const newNeighborhood = res.data;

			// Update current branch neighborhoods
			if (current.value && current.value.neighborhoods) {
				current.value.neighborhoods.push(newNeighborhood);
			}

			return newNeighborhood;
		} catch (err: any) {
			error.value = err.message || 'Error al crear el barrio';
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	const updateNeighborhood = async (id: number, data: NeighborhoodFormData) => {
		try {
			isLoading.value = true;
			error.value = null;

			// Update neighborhood via API
			const res = await branchApi.updateNeighborhood(id, data);
			const updatedNeighborhood = res.data;

			// Update current branch neighborhoods
			if (current.value && current.value.neighborhoods) {
				const index = current.value.neighborhoods.findIndex(n => n.id === id);
				if (index !== -1) {
					current.value.neighborhoods[index] = updatedNeighborhood;
				}
			}

			return updatedNeighborhood;
		} catch (err: any) {
			error.value = err.message || 'Error al actualizar el barrio';
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	const deleteNeighborhood = async (id: number) => {
		try {
			isLoading.value = true;
			error.value = null;

			// Delete neighborhood via API
			await branchApi.deleteNeighborhood(id);

			// Remove from current branch neighborhoods
			if (current.value && current.value.neighborhoods) {
				current.value.neighborhoods = current.value.neighborhoods.filter(n => n.id !== id);
			}
		} catch (err: any) {
			error.value = err.message || 'Error al eliminar el barrio';
			throw err;
		} finally {
			isLoading.value = false;
		}
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
		currentUsers,
		currentNeighborhoods,
		createNeighborhood,
		updateNeighborhood,
		deleteNeighborhood
	};
});
