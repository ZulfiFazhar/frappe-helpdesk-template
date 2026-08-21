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
        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
          <LoadingIndicator class="w-5" />
        </div>
        <!-- Error state -->
        <Alert
          v-else-if="loadError"
          :title="__('Failed to load preview')"
          :description="loadError"
          theme="red"
        />
        <!-- PDF: inline preview via blob URL (bypass X-Frame-Options) -->
        <iframe
          v-else-if="isPdf && blobUrl"
          :src="blobUrl"
          class="w-full h-[600px] border-0"
        />
        <!-- DOCX: text summary + download -->
        <div v-else-if="!isPdf" class="flex flex-col gap-3 h-full">
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
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Alert, Button, LoadingIndicator } from "frappe-ui";
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

const loading = ref(false);
const loadError = ref<string | null>(null);
const blobUrl = ref<string | null>(null);

async function loadBlob() {
  if (!isPdf.value || !props.previewUrl) return;
  loading.value = true;
  loadError.value = null;
  revokeBlob();
  try {
    const res = await fetch(props.previewUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    blobUrl.value = URL.createObjectURL(blob);
  } catch (e) {
    loadError.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function revokeBlob() {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value);
    blobUrl.value = null;
  }
}

watch(() => props.previewUrl, loadBlob, { immediate: true });

onBeforeUnmount(revokeBlob);
</script>
