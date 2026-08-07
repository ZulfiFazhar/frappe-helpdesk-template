<template>
  <div class="border-t border-outline-gray-2 p-3 bg-surface-white">
    <div class="flex items-end gap-2">
      <textarea
        ref="textareaRef"
        v-model="text"
        :placeholder="__('Ketik pesan...')"
        :disabled="isStreaming"
        rows="1"
        class="flex-1 resize-none rounded-lg border border-outline-gray-2 bg-surface-gray-1 px-3 py-2 text-base text-ink-gray-9 placeholder-ink-gray-4 focus:border-outline-gray-4 focus:outline-none focus:ring-0 max-h-40"
        @keydown.enter.exact.prevent="onSend"
        @keydown.shift.enter="onShiftEnter"
        @input="autoGrow"
      />
      <Button
        v-if="!isStreaming"
        variant="solid"
        :disabled="!text.trim()"
        @click="onSend"
      >
        <template #icon>
          <LucideSend class="size-4" />
        </template>
      </Button>
      <Button
        v-else
        variant="solid"
        @click="$emit('stop')"
      >
        <template #icon>
          <LucideSquare class="size-4" />
        </template>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { __ } from "@/translation";
import { Button } from "frappe-ui";
import { ref, nextTick } from "vue";
import LucideSend from "~icons/lucide/send";
import LucideSquare from "~icons/lucide/square";

const props = defineProps<{
  isStreaming: boolean;
}>();

const emit = defineEmits<{
  send: [input: string];
  stop: [];
}>();

const text = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function onSend() {
  const trimmed = text.value.trim();
  if (!trimmed || props.isStreaming) return;
  emit("send", trimmed);
  text.value = "";
  nextTick(() => {
    if (textareaRef.value) textareaRef.value.style.height = "auto";
  });
}

function onShiftEnter() {
}

function autoGrow() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}
</script>