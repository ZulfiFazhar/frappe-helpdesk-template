<template>
  <div
    class="rounded-lg border border-outline-gray-2 bg-surface-white p-4 space-y-3"
  >
    <div class="flex items-center justify-between">
      <span class="text-p-base text-ink-gray-9">
        {{ __("Uploading") }}: {{ filename }}
      </span>
      <Button
        v-if="!isUploading"
        variant="ghost"
        icon-left="lucide-x"
        @click="$emit('close')"
      />
    </div>

    <!-- Progress bar -->
    <div class="w-full bg-surface-gray-2 rounded-full h-2 overflow-hidden">
      <div
        class="h-full bg-ink-gray-8 transition-all duration-500 ease-out"
        :class="error ? 'bg-rose-500' : ''"
        :style="{ width: `${progress}%` }"
      />
    </div>
    <div class="flex items-center justify-between">
      <span class="text-p-sm text-ink-gray-6">
        {{ error ? error : currentMessage }}
      </span>
      <span class="text-p-sm text-ink-gray-7 font-mono">{{ progress }}%</span>
    </div>

    <!-- Detail dropdown -->
    <div>
      <button
        class="flex items-center gap-1 text-p-sm text-ink-gray-6 hover:text-ink-gray-9"
        @click="showDetails = !showDetails"
      >
        <LucideChevronDown v-if="!showDetails" class="h-4 w-4" />
        <LucideChevronUp v-else class="h-4 w-4" />
        {{ showDetails ? __("Hide details") : __("Show details") }}
      </button>
      <div
        v-if="showDetails"
        class="mt-2 rounded-md bg-surface-gray-1 p-3 max-h-48 overflow-y-auto"
      >
        <div
          v-for="(event, i) in detailLog"
          :key="i"
          class="font-mono text-xs text-ink-gray-6 py-0.5"
        >
          <span class="text-ink-gray-8">[{{ event.percent }}%]</span>
          {{ event.message }}
          <span v-if="event.detail" class="block pl-6 text-ink-gray-5">{{
            event.detail
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "frappe-ui";
import { __ } from "@/translation";
import LucideChevronDown from "~icons/lucide/chevron-down";
import LucideChevronUp from "~icons/lucide/chevron-up";

const props = defineProps<{
  filename: string;
  progress: number;
  detailLog: Array<{
    step: string;
    percent: number;
    message: string;
    detail: string;
  }>;
  isUploading: boolean;
  error: string | null;
}>();

defineEmits<{ close: [] }>();

const showDetails = ref(false);

const currentMessage = computed(() => {
  if (props.detailLog.length === 0) return "";
  return props.detailLog[props.detailLog.length - 1].message;
});
</script>
