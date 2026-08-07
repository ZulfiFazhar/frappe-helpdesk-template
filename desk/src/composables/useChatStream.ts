export function useChatStream() {
  async function stream(
    url: string,
    body: { input: string; thread_id: string },
    onToken: (token: string) => void,
    onDone: () => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      throw new Error(`Chatbot API error: HTTP ${res.status}`);
    }
    if (!res.body) {
      throw new Error("Chatbot API returned no stream body");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") {
          onDone();
          return;
        }
        onToken(data);
      }
    }
    onDone();
  }
  return { stream };
}