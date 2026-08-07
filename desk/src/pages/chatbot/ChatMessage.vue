<template>
  <div
    class="flex w-full"
    :class="role === 'human' ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[80%] rounded-lg px-4 py-2.5 text-p-sm"
      :class="
        role === 'human'
          ? 'bg-surface-gray-2 text-ink-gray-9'
          : 'bg-surface-white border border-outline-gray-2 text-ink-gray-9'
      "
    >
      <template v-if="role === 'ai'">
        <div v-if="!content && isLoading" class="flex items-center gap-1.5 py-1">
          <span class="size-2 rounded-full bg-ink-gray-4 animate-bounce" style="animation-delay: 0ms" />
          <span class="size-2 rounded-full bg-ink-gray-4 animate-bounce" style="animation-delay: 150ms" />
          <span class="size-2 rounded-full bg-ink-gray-4 animate-bounce" style="animation-delay: 300ms" />
        </div>
        <div
          v-else
          class="prose-chatbot"
          v-html="renderedHtml"
        />
      </template>
      <div v-else class="whitespace-pre-wrap">{{ content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DOMPurify from "dompurify";
import { marked } from "marked";
import { computed, watch, nextTick } from "vue";

const props = defineProps<{
  role: "human" | "ai";
  content: string;
  isLoading?: boolean;
}>();

const renderedHtml = computed(() =>
  DOMPurify.sanitize(marked.parse(props.content, { gfm: true, breaks: true }) as string),
);

watch(
  () => props.content,
  () => nextTick(scrollParentToBottom),
);

function scrollParentToBottom() {
  const el = document.getElementById("chatbot-messages");
  if (el) el.scrollTop = el.scrollHeight;
}
</script>