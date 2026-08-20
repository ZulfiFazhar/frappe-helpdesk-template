# Chatbot Widget Frappe UI Reuse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make the embeddable chatbot widget reuse the exact same Frappe UI components (`ChatInput`, `ChatMessage`) and `useChatStream` composable as the main chatbot page.

**Architecture:** Rewrite `ChatbotWidget.vue` to render `ChatMessage` bubbles and a `ChatInput` input row, driven by the `useChatStream` composable (with an `AbortController` for the Stop button), instead of its current inline `Textarea`/`Button` and inline bubbles. Widget-specific chrome (header, Reset, settings loading, placeholder states) is preserved.

**Tech Stack:** Vue 3 (`<script setup>`), frappe-ui (`Button`, `createResource`, `LoadingIndicator`, `toast`), Vue Router, Tailwind semantic classes.

**Spec:** `docs/superpowers/specs/2026-08-20-chatbot-widget-frappe-ui-design.md`

---

### Task 1: Rewrite ChatbotWidget.vue to reuse ChatInput + ChatMessage + useChatStream

**Files:**
- Modify: `desk/src/pages/chatbot/ChatbotWidget.vue` (full rewrite)

- [ ] **Step 1: Read the current file and the components to reuse**

Read these files to confirm exact imports and component APIs:
- `desk/src/pages/chatbot/ChatbotWidget.vue` (current)
- `desk/src/pages/chatbot/ChatInput.vue` (props: `isStreaming`; emits `send`, `stop`)
- `desk/src/pages/chatbot/ChatMessage.vue` (props: `role: "human"|"ai"`, `content`, `isLoading?`)
- `desk/src/composables/useChatStream.ts` (exports `useChatStream()` → `{ stream(url, body, onToken, onDone, signal) }`)
- `desk/src/pages/chatbot/Chatbot.vue` (reference for how the main page wires these)

- [ ] **Step 2: Rewrite ChatbotWidget.vue**

Replace the entire contents of `desk/src/pages/chatbot/ChatbotWidget.vue` with:

```vue
<template>
  <div class="h-screen w-screen flex flex-col bg-surface-white">
    <header
      class="flex items-center justify-between px-4 py-3 border-b border-outline-gray-2 shrink-0"
    >
      <span class="text-base-semibold text-ink-gray-9">
        {{ brandName || __("Helpdesk Assistant") }}
      </span>
      <Button
        variant="ghost"
        icon-left="lucide-rotate-ccw"
        :label="__('Reset')"
        @click="resetThread"
      />
    </header>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <LoadingIndicator class="w-5" />
    </div>

    <div v-else-if="!enabled" class="flex-1 flex items-center justify-center px-6">
      <p class="text-p-base text-ink-gray-6 text-center">
        {{ __("Chatbot is currently disabled.") }}
      </p>
    </div>

    <div v-else-if="!apiBase" class="flex-1 flex items-center justify-center px-6">
      <p class="text-p-base text-ink-gray-6 text-center">
        {{ __("Chatbot is not configured. Ask an admin to set the API URL.") }}
      </p>
    </div>

    <template v-else>
      <div
        id="chatbot-messages"
        class="flex-1 overflow-y-scroll p-4 flex flex-col gap-3 bg-surface-gray-1"
      >
        <div
          v-if="!messages.length"
          class="flex flex-1 items-center justify-center"
        >
          <div class="text-sm text-ink-gray-5">
            {{ __("Ask anything to start the conversation.") }}
          </div>
        </div>
        <ChatMessage
          v-for="msg in messages"
          :key="msg.id"
          :role="msg.role"
          :content="msg.content"
          :is-loading="isStreaming && msg.role === 'ai' && !msg.content"
        />
      </div>
      <ChatInput
        :is-streaming="isStreaming"
        @send="onSend"
        @stop="onStop"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useChatStream } from "@/composables/useChatStream";
import { Button, createResource, LoadingIndicator, toast } from "frappe-ui";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { __ } from "@/translation";
import ChatInput from "./ChatInput.vue";
import ChatMessage from "./ChatMessage.vue";

interface Message {
  id: string;
  role: "human" | "ai";
  content: string;
}

const loading = ref(true);
const enabled = ref(false);
const apiBase = ref("");
const brandName = ref("");
const messages = ref<Message[]>([]);
const isStreaming = ref(false);
let abortController: AbortController | null = null;

const { stream } = useChatStream();

const settingsResource = createResource({
  url: "frappe.client.get",
  params: {
    doctype: "HD Settings",
    name: "HD Settings",
    fields: ["chatbot_enabled", "chatbot_api_url", "brand_name"],
  },
  auto: false,
  onSuccess(data: {
    chatbot_enabled: number;
    chatbot_api_url: string;
    brand_name: string;
  }) {
    enabled.value = Boolean(data.chatbot_enabled);
    apiBase.value = (data.chatbot_api_url || "").trim();
    brandName.value = data.brand_name || "";
    loading.value = false;
  },
  onError(error: { message?: string } = {}) {
    toast.error(error.message ?? __("Failed to load chatbot settings"));
    loading.value = false;
  },
});

onMounted(() => {
  settingsResource.submit();
});

onBeforeUnmount(() => {
  if (abortController) abortController.abort();
});

function resetThread() {
  if (abortController) abortController.abort();
  abortController = null;
  isStreaming.value = false;
  messages.value = [];
}

async function onSend(input: string) {
  if (isStreaming.value || !apiBase.value) return;
  messages.value.push({ id: crypto.randomUUID(), role: "human", content: input });
  const aiIndex = messages.value.length;
  messages.value.push({ id: crypto.randomUUID(), role: "ai" as const, content: "" });
  isStreaming.value = true;
  abortController = new AbortController();
  try {
    await stream(
      ${apiBase.value}/api/chatbot/stream,
      { input, thread_id: crypto.randomUUID() },
      (token) => {
        messages.value[aiIndex].content += token;
      },
      () => {
        isStreaming.value = false;
        abortController = null;
      },
      abortController.signal,
    );
  } catch (e) {
    isStreaming.value = false;
    abortController = null;
    if ((e as Error).name === "AbortError") return;
    if (!messages.value[aiIndex]?.content) messages.value.pop();
    const msg = (e as Error)?.message || "";
    if (msg.includes("Failed to fetch")) {
      toast.error(__("CORS ditolak, periksa konfigurasi server"));
    } else {
      toast.error(__("Gagal terhubung ke chatbot API"));
    }
  }
}

function onStop() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  isStreaming.value = false;
}
</script>
```

- [ ] **Step 3: Verify no diagnostics errors**

Run the `diagnostics` tool on `desk/src/pages/chatbot/ChatbotWidget.vue`.
Expected: no errors or warnings (ignore any pre-existing errors in unrelated files).

- [ ] **Step 4: Commit**

```bash
git add desk/src/pages/chatbot/ChatbotWidget.vue
git commit -m "refactor: reuse main chatbot UI components in widget"
```

---

## Self-Review

- **Spec coverage:** Spec requires reusing `ChatInput`, `ChatMessage`, `useChatStream`, `id="chatbot-messages"`, `bg-surface-gray-1`, AbortController for Stop, roles `@@"human"|"ai"`, and preserving header/Reset/settings/placeholders. All covered in Task 1.
- **Placeholder scan:** No TBD/TODO; full file content provided.
- **Type consistency:** `Message` uses `role: "human"|"ai"` matching `ChatMessage`; `stream` signature matches `useChatStream`; `onSend`/`onStop` match `ChatInput` emits.
