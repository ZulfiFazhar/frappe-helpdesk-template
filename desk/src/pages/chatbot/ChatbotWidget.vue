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
          @create-ticket="onCreateTicket"
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
import { useRouter } from "vue-router";
import { isCustomerPortal } from "@/utils";
import type { TicketRecommendation } from "./types";
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

const router = useRouter();
let currentThreadId: string | null = null;

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
  currentThreadId = null;
}

async function onSend(input: string) {
  if (isStreaming.value || !apiBase.value) return;
  messages.value.push({ id: crypto.randomUUID(), role: "human", content: input });
  const aiIndex = messages.value.length;
  messages.value.push({ id: crypto.randomUUID(), role: "ai" as const, content: "" });
  isStreaming.value = true;
  abortController = new AbortController();
  currentThreadId = crypto.randomUUID();
  try {
    await stream(
      `${apiBase.value}/api/chatbot/stream`,
      { input, thread_id: currentThreadId },
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

async function onCreateTicket(rec: TicketRecommendation) {
  let historyText = "";
  try {
    if (currentThreadId) {
      const res = await fetch(
        `${apiBase.value}/api/chatbot/threads/${currentThreadId}`
      );
      if (res.ok) {
        const json = await res.json();
        historyText = (json.data?.messages || [])
          .map((m: { role: string; content: string }) =>
            `${m.role === "human" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n");
      }
    }
  } catch {
    toast.error(__("Gagal memuat riwayat percakapan, tiket dibuat tanpa riwayat"));
  }

  const fullDescription = historyText
    ? `${rec.description}\n\n--- Riwayat Percakapan ---\n${historyText}`
    : rec.description;

  sessionStorage.setItem("chatbot_ticket_description", fullDescription);

  router.push({
    name: isCustomerPortal.value ? "TicketNew" : "TicketAgentNew",
    query: {
      subject: rec.subject,
      priority: rec.priority,
      ticket_type: rec.category,
    },
  });
}

</script>
