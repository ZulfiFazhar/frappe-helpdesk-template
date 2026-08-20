<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    @click.self="$emit('close')"
  >
    <div
      class="bg-surface-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col"
    >
      <div
        class="flex items-center justify-between px-4 py-3 border-b border-outline-gray-2"
      >
        <span class="text-base-semibold text-ink-gray-9">
          {{ filename }}
        </span>
        <Button variant="ghost" icon-left="lucide-x" @click="$emit('close')" />
      </div>

      <div class="flex-1 overflow-hidden p-4">
        <!-- PDF: inline preview via iframe -->
        <iframe
          v-if="isPdf"
          :src="previewUrl"
          class="w-full h-[600px] border-0"
        />
        <!-- DOCX: text summary + download -->
        <div v-else class="flex flex-col gap-3 h-full">
          <div class="text-p-sm text-ink-gray-6">
            {{
              __("DOCX preview not available. Download to view full content.")
            }}
          </div>
          <div
            class="flex-1 overflow-y-auto rounded-md bg-surface-gray-1 p-3 text-p-sm text-ink-gray-7 whitespace-pre-wrap"
          >
            {{ description }}
          </div>
          <a :href="previewUrl" download class="inline-block">
            <Button variant="solid" icon-left="lucide-download">
              {{ __("Download Original") }}
            </Button>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button } from "frappe-ui";
import { __ } from "@/translation";

const props = defineProps<{
  filename: string;
  previewUrl: string;
  description: string;
}>();

defineEmits<{ close: [] }>();

const isPdf = computed(() => {
  return props.filename.toLowerCase().endsWith(".pdf");
});
</script>
