<template>
  <div class="mx-auto w-full max-w-4xl px-5 py-6 flex flex-col gap-3">
    <!-- Header with upload button -->
    <div class="flex items-center justify-between">
      <div class="text-lg-medium text-ink-gray-9">
        {{ __("RAG Documents") }}
      </div>
      <Button
        :label="__('Upload Document')"
        variant="solid"
        :disabled="ragUpload.isUploading.value"
        @click="triggerFilePicker"
      >
        <template #prefix>
          <LucidePlus class="h-4 w-4" />
        </template>
      </Button>
      <input
        ref="fileInput"
        type="file"
        accept=".pdf,.docx"
        class="hidden"
        @change="onFileSelected"
      />
    </div>

    <!-- Upload progress panel -->
    <RagUploadProgress
      v-if="ragUpload.isUploading.value || ragUpload.completeData.value"
      :filename="currentUploadFilename"
      :progress="ragUpload.progress.value"
      :detail-log="ragUpload.detailLog.value"
      :is-uploading="ragUpload.isUploading.value"
      :error="ragUpload.error.value"
      @close="closeProgress"
    />

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-8">
      <LoadingIndicator class="w-5" />
    </div>

    <!-- Error state -->
    <Alert
      v-else-if="error"
      :title="__('RAG service unavailable')"
      :description="error"
      theme="red"
    >
      <Button
        variant="subtle"
        class="mt-3"
        :label="__('Retry')"
        @click="fetchDocs"
      />
    </Alert>

    <!-- Empty state -->
    <div
      v-else-if="documents.length === 0"
      class="rounded-lg border border-outline-gray-2 p-6 text-center"
    >
      <LucideFileText class="h-10 w-10 mx-auto text-ink-gray-4" />
      <p class="mt-2 text-p-base text-ink-gray-6">
        {{ __("No RAG documents uploaded yet.") }}
      </p>
    </div>

    <!-- Document list -->
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="doc in documents"
        :key="doc.doc_id"
        class="flex items-center justify-between rounded-lg border border-outline-gray-2 p-3 hover:bg-surface-gray-1"
      >
        <div class="flex items-center gap-3 min-w-0">
          <LucideFileText
            class="h-5 w-5 flex-shrink-0 text-ink-gray-6"
          />
          <div class="min-w-0">
            <div class="text-p-base text-ink-gray-9 truncate">
              {{ doc.filename }}
            </div>
            <div class="text-p-sm text-ink-gray-5">
              {{ doc.chunks_count }} {{ __("chunks") }} ·
              {{ formatDate(doc.created_at) }}
              <span v-if="linkedArticles[doc.doc_id]">
                · {{ __("Linked") }}:
                <router-link
                  :to="{
                    name: 'Article',
                    params: { articleId: linkedArticles[doc.doc_id].name },
                  }"
                  class="text-link-500 hover:underline"
                >
                  {{ linkedArticles[doc.doc_id].title }}
                </router-link>
              </span>
              <span v-else-if="linkedArticlesFetched">
                · {{ __("No article") }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <Button
            v-if="isPdf(doc.filename)"
            variant="ghost"
            :label="__('Preview')"
            @click="openPreview(doc)"
          />
          <Button
            v-else
            variant="ghost"
            :label="__('Download')"
            @click="downloadFile(doc.preview_url)"
          />
          <Button
            variant="ghost"
            icon-left="lucide-trash-2"
            @click="confirmDelete(doc)"
          />
        </div>
      </div>
    </div>

    <!-- Preview modal -->
    <RagPreviewModal
      v-if="previewDoc"
      :filename="previewDoc.filename"
      :preview-url="previewDoc.preview_url"
      :description="previewDoc.description"
      @close="previewDoc = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  Alert,
  Button,
  LoadingIndicator,
  createResource,
  toast,
} from "frappe-ui";
import { __ } from "@/translation";
import LucidePlus from "~icons/lucide/plus";
import LucideFileText from "~icons/lucide/file-text";
import { globalStore } from "@/stores/globalStore";
import {
  createArticleFromRag,
  deleteLinkedArticle,
  findLinkedArticles,
} from "@/stores/knowledgeBase";
import { useRagUpload } from "@/pages/chatbot/composables/useRagUpload";
import RagUploadProgress from "./RagUploadProgress.vue";
import RagPreviewModal from "./RagPreviewModal.vue";

type RagDoc = {
  doc_id: string;
  filename: string;
  description: string;
  preview_url: string;
  status: string;
  created_at: string;
  chunks_count: number;
};

type LinkedArticle = {
  name: string;
  title: string;
  status: string;
  rag_doc_id: string;
};

const { $dialog } = globalStore();

const loading = ref(true);
const error = ref<string | null>(null);
const documents = ref<RagDoc[]>([]);
const linkedArticles = ref<Record<string, LinkedArticle>>({});
const linkedArticlesFetched = ref(false);
const previewDoc = ref<RagDoc | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const currentUploadFilename = ref("");

const ragUpload = useRagUpload();

// Fetch chatbot_api_url from HD Settings (auto-fetches on mount)
const settingsResource = createResource({
  url: "frappe.client.get",
  params: {
    doctype: "HD Settings",
    name: "HD Settings",
    fields: ["chatbot_api_url"],
  },
  auto: true,
  onSuccess(data: { chatbot_api_url: string }) {
    apiBase.value = (data.chatbot_api_url || "").trim();
    fetchDocs();
  },
  onError() {
    loading.value = false;
    error.value = __("Failed to load settings");
  },
});

const apiBase = ref("");

async function fetchDocs() {
  loading.value = true;
  error.value = null;

  if (!apiBase.value) {
    error.value = __("RAG API base URL not configured");
    loading.value = false;
    return;
  }

  try {
    const res = await fetch(`${apiBase.value}/api/rag/knowledge-base`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    documents.value = json?.data?.documents || [];
    await fetchLinkedArticles();
  } catch (e) {
    error.value = (e as Error).message;
    documents.value = [];
  } finally {
    loading.value = false;
  }
}

async function fetchLinkedArticles() {
  if (!documents.value.length) {
    linkedArticlesFetched.value = true;
    return;
  }
  const docIds = documents.value.map((d) => d.doc_id);
  findLinkedArticles.submit(
    { rag_doc_ids: docIds },
    {
      onSuccess(data: LinkedArticle[]) {
        const map: Record<string, LinkedArticle> = {};
        for (const article of data || []) {
          map[article.rag_doc_id] = article;
        }
        linkedArticles.value = map;
        linkedArticlesFetched.value = true;
      },
      onError() {
        linkedArticlesFetched.value = true;
      },
    },
  );
}

function triggerFilePicker() {
  fileInput.value?.click();
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = "";

  // Client-side validation
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "pdf" && ext !== "docx") {
    toast.error(__("Only PDF and DOCX files are supported"));
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    toast.error(__("File too large. Maximum size is 20MB"));
    return;
  }

  currentUploadFilename.value = file.name;

  // apiBase is auto-fetched on mount via settingsResource; if not ready yet, skip
  if (!apiBase.value) {
    toast.error(__("RAG API base URL not configured"));
    return;
  }

  // Upload via SSE
  const result = await ragUpload.upload(file, apiBase.value);

  if (result && result.step === "complete") {
    // Create draft HD Article
    createArticleFromRag.submit(
      {
        title: result.filename || file.name,
        content: result.extracted_text || "",
        category: "",
        rag_doc_id: result.doc_id || "",
        minio_object_key: result.minio_object_key || "",
      },
      {
        onSuccess() {
          toast.success(__("Document uploaded and article created"));
          fetchDocs();
        },
        onError(err: { messages?: string[]; message?: string }) {
          toast.warning(
            err?.messages?.[0] ||
              err?.message ||
              __("RAG upload succeeded but article creation failed"),
          );
          fetchDocs();
        },
      },
    );
  } else if (ragUpload.error.value) {
    toast.error(ragUpload.error.value);
  }

  ragUpload.reset();
}

function closeProgress() {
  ragUpload.reset();
}

function isPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf");
}

function openPreview(doc: RagDoc) {
  previewDoc.value = doc;
}

function downloadFile(url: string) {
  window.open(url, "_blank");
}

function confirmDelete(doc: RagDoc) {
  const linkedArticle = linkedArticles.value[doc.doc_id];
  $dialog({
    title: __("Delete document?"),
    message: __(
      "This will remove the RAG index, MinIO file, and linked HD Article.",
    ),
    actions: [
      {
        label: __("Delete"),
        theme: "red",
        iconLeft: "trash-2",
        variant: "solid",
        onClick({ close }: { close: () => void }) {
          handleDelete(doc, linkedArticle);
          close();
        },
      },
    ],
  });
}

async function handleDelete(doc: RagDoc, linkedArticle?: LinkedArticle) {
  try {
    // Delete from FastAPI (LightRAG + MinIO)
    const res = await fetch(
      `${apiBase.value}/api/rag/documents/${doc.doc_id}`,
      {
        method: "DELETE",
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Delete linked HD Article from Frappe
    if (linkedArticle) {
      deleteLinkedArticle.submit(
        { name: linkedArticle.name },
        {
          onError(err: { messages?: string[]; message?: string }) {
            toast.warning(
              err?.messages?.[0] ||
                err?.message ||
                __("RAG doc deleted but article removal failed"),
            );
          },
        },
      );
    }

    toast.success(__("Document deleted successfully"));
    fetchDocs();
  } catch (e) {
    toast.error((e as Error).message);
  }
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString();
}

// No onMounted needed — settingsResource auto-fetches on creation, and its
// onSuccess callback triggers fetchDocs().
</script>
