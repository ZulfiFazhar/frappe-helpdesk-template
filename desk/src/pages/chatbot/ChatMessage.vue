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
        <Button
          v-if="ticketRecommendation"
          variant="solid"
          theme="gray"
          :label="__('Buat Tiket')"
          class="mt-2"
          @click="emit('create-ticket', ticketRecommendation)"
        >
          <template #icon>
            <LucideTicket class="size-4" />
          </template>
        </Button>
      </template>
      <div v-else class="whitespace-pre-wrap">{{ content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DOMPurify from "dompurify";
import { marked } from "marked";
import { ref, watch, nextTick } from "vue";
import type { TicketRecommendation } from "./types";
import LucideTicket from "~icons/lucide/ticket";

const TICKET_BLOCK_RE = /```json:ticket\n([\s\S]*?)```/

const ticketRecommendation = ref<TicketRecommendation | null>(null)

function parseTicketBlock(content: string): { cleaned: string; rec: TicketRecommendation | null } {
  const match = content.match(TICKET_BLOCK_RE)
  if (!match) return { cleaned: content, rec: null }
  try {
    const parsed = JSON.parse(match[1].trim())
    if (!parsed.subject || !parsed.description) return { cleaned: content, rec: null }
    return {
      cleaned: content.replace(TICKET_BLOCK_RE, "").trim(),
      rec: {
        subject: String(parsed.subject),
        description: String(parsed.description),
        priority: ["Low", "Medium", "High"].includes(parsed.priority) ? parsed.priority : "Medium",
        category: String(parsed.category || "Umum"),
        customer: String(parsed.customer || "unknown"),
      },
    }
  } catch {
    return { cleaned: content, rec: null }
  }
}

const props = defineProps<{
  role: "human" | "ai";
  content: string;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  "create-ticket": [rec: TicketRecommendation]
}>()

const renderedHtml = ref("");

function updateHtml() {
  if (props.role !== "ai" || !props.content) {
    renderedHtml.value = ""
    ticketRecommendation.value = null
    return
  }
  const { cleaned, rec } = parseTicketBlock(props.content)
  ticketRecommendation.value = rec
  if (!cleaned) {
    renderedHtml.value = ""
    return
  }
  renderedHtml.value = DOMPurify.sanitize(
    marked.parse(cleaned, { gfm: true, breaks: true, async: false }) as string,
  )
  nextTick(scrollParentToBottom)
}

watch(() => props.content, updateHtml, { immediate: true });

function scrollParentToBottom() {
  const el = document.getElementById("chatbot-messages");
  if (el) el.scrollTop = el.scrollHeight;
}
</script>
