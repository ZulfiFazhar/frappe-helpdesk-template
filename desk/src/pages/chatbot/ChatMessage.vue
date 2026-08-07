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
      <div
        v-if="role === 'ai'"
        class="prose-chatbot"
        v-html="renderedHtml"
      />
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