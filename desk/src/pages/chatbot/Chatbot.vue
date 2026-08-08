<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between border-b border-outline-gray-2 px-4 py-3 bg-surface-white shrink-0">
      <div class="text-lg-medium text-ink-gray-9">
        {{ __("Chatbot") }} v3
      </div>
    </div>

    <div class="flex flex-1 min-h-0">
      <ThreadList
        :threads="threads"
        :active-thread-id="activeThreadId"
        @select="onSelectThread"
        @new-chat="onNewChat"
      />
      <div class="flex flex-1 flex-col min-w-0">
        <div
          v-if="!chatbotApiUrl"
          class="flex flex-1 items-center justify-center p-4"
        >
          <div class="text-sm text-ink-gray-6 text-center max-w-sm">
            {{ __("Chatbot API URL belum dikonfigurasi. Hubungi admin untuk mengatur di HD Settings.") }}
          </div>
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
                {{ __("Mulai percakapan baru dengan mengirim pesan.") }}
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChatStream } from "@/composables/useChatStream";
import { useConfigStore } from "@/stores/config";
import { toast } from "frappe-ui";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { __ } from "@/translation";
import ChatInput from "./ChatInput.vue";
import ChatMessage from "./ChatMessage.vue";
import ThreadList from "./ThreadList.vue";

interface Message {
  id: string;
  role: "human" | "ai";
  content: string;
}

const configStore = useConfigStore();
const chatbotApiUrl = computed(() => configStore.chatbotApiUrl);
const { stream } = useChatStream();

const threads = ref<{ thread_id: string }[]>([]);
const activeThreadId = ref<string | null>(null);
const messages = ref<Message[]>([]);
const isStreaming = ref(false);
let abortController: AbortController | null = null;

onBeforeUnmount(() => {
  if (abortController) abortController.abort();
});

async function fetchThreads() {
  try {
    const res = await fetch(`${chatbotApiUrl.value}/api/chatbot/threads`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    threads.value = (json.data?.thread_ids || []).map(
      (id: string) => ({ thread_id: id }),
    );
  } catch (e) {
    const msg = (e as Error)?.message || "";
    if (msg.includes("Failed to fetch")) {
      toast.error(__("CORS ditolak, periksa konfigurasi server"));
    } else {
      toast.error(__("Gagal memuat daftar percakapan"));
    }
  }
}

async function onSelectThread(threadId: string) {
  activeThreadId.value = threadId;
  messages.value = [];
  try {
    const res = await fetch(
      `${chatbotApiUrl.value}/api/chatbot/threads/${encodeURIComponent(threadId)}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    messages.value = (json.data?.messages || []).map(
      (m: { role: string; content: string }) => ({
        id: crypto.randomUUID(),
        role: m.role === "human" ? "human" : "ai",
        content: m.content,
      }),
    );
  } catch (e) {
    const msg = (e as Error)?.message || "";
    if (msg.includes("Failed to fetch")) {
      toast.error(__("CORS ditolak, periksa konfigurasi server"));
    } else {
      toast.error(__("Gagal memuat riwayat percakapan"));
    }
  }
}

function onNewChat() {
  activeThreadId.value = null;
  messages.value = [];
}

async function onSend(input: string) {
  if (isStreaming.value || !chatbotApiUrl.value) return;
  const threadId = activeThreadId.value || crypto.randomUUID();
  if (!activeThreadId.value) {
    activeThreadId.value = threadId;
    threads.value.unshift({ thread_id: threadId });
    messages.value = [];
  }
  messages.value.push({ id: crypto.randomUUID(), role: "human", content: input });
  const aiIndex = messages.value.length;
  messages.value.push({ id: crypto.randomUUID(), role: "ai" as const, content: "" });
  isStreaming.value = true;
  abortController = new AbortController();
  try {
    await stream(
      `${chatbotApiUrl.value}/api/chatbot/stream`,
      { input, thread_id: threadId },
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

onMounted(fetchThreads);
</script>
