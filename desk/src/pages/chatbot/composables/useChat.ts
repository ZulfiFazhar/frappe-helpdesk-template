import { ref, type Ref } from "vue";
import { useLocalStorage } from "@vueuse/core";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export function parseSSEChunk(chunk: string): string[] {
  const out: string[] = [];
  for (const block of chunk.split("\n\n")) {
    const line = block.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") continue;
    out.push(payload);
  }
  return out;
}

export function useChat(apiBase: string) {
  const messages = ref<ChatMessage[]>([]) as Ref<ChatMessage[]>;
  const threadId = useLocalStorage<string>("chatbot_thread_id", "");
  const isStreaming = ref(false);
  const error = ref<string | null>(null);

  async function send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || isStreaming.value) return;
    error.value = null;
    if (!threadId.value) threadId.value = crypto.randomUUID();
    messages.value.push({ role: "user", content: trimmed });
    messages.value.push({ role: "assistant", content: "" });
    isStreaming.value = true;
    try {
      const res = await fetch(`${apiBase}/api/chatbot/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed, thread_id: threadId.value }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const last = () => messages.value[messages.value.length - 1]!;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          for (const payload of parseSSEChunk(part + "\n\n")) {
            const token = JSON.parse(payload) as string;
            last().content += token;
          }
        }
      }
    } catch (e) {
      error.value = (e as Error).message;
      await fallback(trimmed);
    } finally {
      isStreaming.value = false;
    }
  }

  async function fallback(text: string): Promise<void> {
    try {
      const res = await fetch(`${apiBase}/api/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text, thread_id: threadId.value }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const last = messages.value[messages.value.length - 1]!;
      last.content = json?.data?.response ?? "";
    } catch (e) {
      error.value = (e as Error).message;
    }
  }

  function resetThread(): void {
    threadId.value = "";
    messages.value = [];
    error.value = null;
  }

  return { messages, threadId, send, isStreaming, error, resetThread };
}
