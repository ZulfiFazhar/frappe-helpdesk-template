import { ref } from "vue";
import { parseSSEChunk } from "./useChat";

export type UploadProgressEvent = {
  step: string;
  percent: number;
  message: string;
  detail: string;
  doc_id?: string;
  track_id?: string;
  minio_object_key?: string;
  extracted_text?: string;
  filename?: string;
};

export function useRagUpload() {
  const progress = ref(0);
  const detailLog = ref<UploadProgressEvent[]>([]);
  const isUploading = ref(false);
  const error = ref<string | null>(null);
  const completeData = ref<UploadProgressEvent | null>(null);

  async function upload(
    file: File,
    apiBase: string,
  ): Promise<UploadProgressEvent | null> {
    progress.value = 0;
    detailLog.value = [];
    isUploading.value = true;
    error.value = null;
    completeData.value = null;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${apiBase}/api/rag/documents/upload-stream`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          for (const payload of parseSSEChunk(part + "\n\n")) {
            const event = JSON.parse(payload) as UploadProgressEvent;
            progress.value = event.percent;
            detailLog.value.push(event);
            if (event.step === "complete") {
              completeData.value = event;
            }
            if (event.step === "error") {
              error.value = event.message;
            }
          }
        }
      }
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      isUploading.value = false;
    }

    return completeData.value;
  }

  function reset(): void {
    progress.value = 0;
    detailLog.value = [];
    isUploading.value = false;
    error.value = null;
    completeData.value = null;
  }

  return {
    progress,
    detailLog,
    isUploading,
    error,
    completeData,
    upload,
    reset,
  };
}
