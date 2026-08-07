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
        <div v-if="!content && isLoading" class="flex items-center gap-2 py-1">
          <span class="size-4 border-2 rounded-full animate-spin" style="border-color: #000; border-top-color: transparent;" />
          <span class="text-sm font-bold text-ink-gray-9 animate-pulse">Thinking...</span>
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
import { ref, watch, nextTick } from "vue";

const props = defineProps<{
  role: "human" | "ai";
  content: string;
  isLoading?: boolean;
}>();

const renderedHtml = ref("");

function updateHtml() {
  if (props.role !== "ai" || !props.content) {
    renderedHtml.value = "";
    return;
  }
  renderedHtml.value = DOMPurify.sanitize(
    marked.parse(props.content, { gfm: true, breaks: true, async: false }) as string,
  );
  nextTick(scrollParentToBottom);
}

watch(() => props.content, updateHtml, { immediate: true });

function scrollParentToBottom() {
  const el = document.getElementById("chatbot-messages");
  if (el) el.scrollTop = el.scrollHeight;
}
</script>
