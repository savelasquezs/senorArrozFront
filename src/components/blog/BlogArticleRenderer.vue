<template>
  <div class="space-y-4 text-gray-800">
    <template v-for="(block, index) in blocks" :key="`${block.type}-${index}`">
      <p v-if="block.type === 'paragraph'" class="leading-7">
        <BlogRichText :segments="block.richText" />
      </p>

      <h2 v-else-if="block.type === 'heading_1'" class="pt-4 text-2xl font-bold text-gray-950">
        <BlogRichText :segments="block.richText" />
      </h2>
      <h3 v-else-if="block.type === 'heading_2'" class="pt-4 text-xl font-semibold text-gray-950">
        <BlogRichText :segments="block.richText" />
      </h3>
      <h4 v-else-if="block.type === 'heading_3'" class="pt-3 text-lg font-semibold text-gray-950">
        <BlogRichText :segments="block.richText" />
      </h4>

      <ul v-else-if="block.type === 'bulleted_list_item'" class="list-disc pl-6">
        <li>
          <BlogRichText :segments="block.richText" />
          <BlogArticleRenderer v-if="block.children.length" :blocks="block.children" class="mt-2" />
        </li>
      </ul>
      <ol v-else-if="block.type === 'numbered_list_item'" class="list-decimal pl-6">
        <li>
          <BlogRichText :segments="block.richText" />
          <BlogArticleRenderer v-if="block.children.length" :blocks="block.children" class="mt-2" />
        </li>
      </ol>

      <blockquote v-else-if="block.type === 'quote'" class="border-l-4 border-emerald-500 pl-4 italic text-gray-700">
        <BlogRichText :segments="block.richText" />
      </blockquote>

      <hr v-else-if="block.type === 'divider'" class="border-gray-200" />

      <div v-else-if="block.type === 'table'" class="overflow-x-auto rounded-xl border border-gray-200">
        <table class="min-w-full border-collapse text-sm">
          <tbody>
            <tr v-for="(row, rowIndex) in block.children" :key="rowIndex" class="border-b border-gray-100 last:border-b-0">
              <td
                v-for="(cell, cellIndex) in row.cells"
                :key="cellIndex"
                class="px-4 py-3 align-top first:font-medium"
              >
                <BlogRichText :segments="cell" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import BlogRichText from '@/components/blog/BlogRichText.vue'
import type { BlogBlock } from '@/types/blogPublishing'

defineOptions({ name: 'BlogArticleRenderer' })
defineProps<{ blocks: BlogBlock[] }>()
</script>
