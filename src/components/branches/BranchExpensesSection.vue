<template>
  <BaseCard>
    <div class="space-y-4">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="[
              modelValue === tab.value
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
            @click="$emit('update:modelValue', tab.value)"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <ExpenseCategoriesTable
        v-if="modelValue === 'categories'"
        :list="expenseCategories"
        :loading="expenseCategoriesLoading"
        @create="$emit('create-expense-category')"
        @edit="$emit('edit-expense-category', $event)"
        @delete="$emit('delete-expense-category', $event)"
        @previous-page="$emit('previous-expense-category-page')"
        @next-page="$emit('next-expense-category-page')"
      />

      <ExpensesTable
        v-if="modelValue === 'expenses'"
        :list="expenses"
        :categories="expenseCategories?.items || []"
        :loading="expensesLoading"
        @create="$emit('create-expense')"
        @edit="$emit('edit-expense', $event)"
        @delete="$emit('delete-expense', $event)"
        @filter-change="$emit('expense-filter-change', $event)"
        @search-change="$emit('expense-search-change', $event)"
        @previous-page="$emit('previous-expense-page')"
        @next-page="$emit('next-expense-page')"
      />

      <SuppliersTable
        v-if="modelValue === 'suppliers'"
        :list="suppliers"
        :loading="suppliersLoading"
        :can-manage="canManageSuppliers"
        @create="$emit('create-supplier')"
        @edit="$emit('edit-supplier', $event)"
        @delete="$emit('delete-supplier', $event)"
        @previous-page="$emit('previous-supplier-page')"
        @next-page="$emit('next-supplier-page')"
      />
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import ExpenseCategoriesTable from '@/components/expenses/ExpenseCategoriesTable.vue'
import ExpensesTable from '@/components/expenses/ExpensesTable.vue'
import SuppliersTable from '@/components/suppliers/SuppliersTable.vue'
import type { PagedResult } from '@/types/common'
import type { Expense, ExpenseCategory } from '@/types/expense'
import type { Supplier } from '@/types/supplier'

type BranchExpensesTab = 'categories' | 'expenses' | 'suppliers'

defineProps<{
  modelValue: BranchExpensesTab
  expenseCategories: PagedResult<ExpenseCategory> | null
  expenseCategoriesLoading: boolean
  expenses: PagedResult<Expense> | null
  expensesLoading: boolean
  suppliers: PagedResult<Supplier> | null
  suppliersLoading: boolean
  canManageSuppliers: boolean
}>()

defineEmits<{
  'update:modelValue': [value: BranchExpensesTab]
  'create-expense-category': []
  'edit-expense-category': [category: ExpenseCategory]
  'delete-expense-category': [category: ExpenseCategory]
  'previous-expense-category-page': []
  'next-expense-category-page': []
  'create-expense': []
  'edit-expense': [expense: Expense]
  'delete-expense': [expense: Expense]
  'expense-filter-change': [categoryId: number | null]
  'expense-search-change': [name: string]
  'previous-expense-page': []
  'next-expense-page': []
  'create-supplier': []
  'edit-supplier': [supplier: Supplier]
  'delete-supplier': [supplier: Supplier]
  'previous-supplier-page': []
  'next-supplier-page': []
}>()

const tabs: Array<{ value: BranchExpensesTab; label: string }> = [
  { value: 'categories', label: 'Categorias' },
  { value: 'expenses', label: 'Gastos' },
  { value: 'suppliers', label: 'Proveedores' },
]
</script>
