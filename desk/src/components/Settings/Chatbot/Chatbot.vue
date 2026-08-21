<template>
  <SettingsLayoutBase :description="__('Configure the embeddable chatbot widget.')">
    <template #title>
      <div class="flex items-center gap-2">
        <h1 class="text-lg-semibold text-ink-gray-8">
          {{ __("Chatbot") }}
        </h1>
        <UnsavedBadge :show="isDirty" />
      </div>
    </template>
    <template #header-actions>
      <Transition name="fade">
        <div v-if="isDirty">
          <Button
            variant="solid"
            :label="__('Save')"
            :loading="saveResource.loading"
            @click="save"
          />
        </div>
      </Transition>
    </template>
    <template #content>
      <div
        v-if="loadResource.loading && !loadResource.data"
        class="flex items-center justify-center py-6"
      >
        <LoadingIndicator class="w-4" />
      </div>
      <div v-else>
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <span class="text-base-medium text-ink-gray-8">{{ __("Enable chatbot widget") }}</span>
            <span class="text-p-sm text-ink-gray-6">{{ __("Show the chatbot page at /helpdesk/chatbot-widget for iframe embedding.") }}</span>
          </div>
          <Switch v-model="enabled" />
        </div>
        <hr class="my-8" />
        <div class="flex flex-col gap-1.5">
          <span class="text-base-medium text-ink-gray-8">{{ __("Chatbot API base URL") }}</span>
          <TextInput v-model="apiBase" :placeholder="__('http://localhost:8000')" />
          <span class="text-p-sm text-ink-gray-6">{{ __("Base URL of the AI backend (FastAPI). Must allow CORS from this site origin.") }}</span>
        </div>
        <hr class="my-8" />
        <div class="flex flex-col gap-2">
          <span class="text-base-semibold text-ink-gray-9">{{ __("Embed code") }}</span>
          <span class="text-p-sm text-ink-gray-6">{{ __("Iframe hanya berfungsi di halaman dengan domain yang sama dengan situs ini.") }}</span>
          <TextInput :model-value="embedUrl" readonly />
          <textarea :value="embedCode" readonly rows="3" class="rounded-lg border border-outline-gray-2 px-3 py-2 text-p-sm text-ink-gray-8 bg-surface-gray-1"></textarea>
          <Button variant="outline" icon-left="lucide-copy" :label="__('Copy embed code')" @click="copy" />
        </div>
      </div>
    </template>
  </SettingsLayoutBase>
</template>

<script setup lang="ts">
import SettingsLayoutBase from "@/components/layouts/SettingsLayoutBase.vue";
import UnsavedBadge from "@/components/UnsavedBadge.vue";
import { __ } from "@/translation";
import { Button, createResource, LoadingIndicator, Switch, TextInput, toast } from "frappe-ui";
import { computed, ref, watch } from "vue";
import { disableSettingModalOutsideClick } from "../settingsModal";

const enabled = ref(false);
const apiBase = ref("");
const initial = ref("");

const loadResource = createResource({
  url: "frappe.client.get",
  params: {
    doctype: "HD Settings",
    name: "HD Settings",
    fields: ["chatbot_enabled", "chatbot_api_url"],
  },
  auto: true,
  onSuccess(data: { chatbot_enabled: number; chatbot_api_url: string }) {
    enabled.value = Boolean(data.chatbot_enabled);
    apiBase.value = data.chatbot_api_url || "";
    initial.value = JSON.stringify({ e: enabled.value, a: apiBase.value });
  },
});

const saveResource = createResource({
  url: "frappe.client.set_value",
  makeParams() {
    return {
      doctype: "HD Settings",
      name: "HD Settings",
      fieldname: {
        chatbot_enabled: enabled.value ? 1 : 0,
        chatbot_api_url: apiBase.value,
      },
    };
  },
  onSuccess(data: { chatbot_enabled: number; chatbot_api_url: string }) {
    enabled.value = Boolean(data.chatbot_enabled);
    apiBase.value = data.chatbot_api_url || "";
    initial.value = JSON.stringify({ e: enabled.value, a: apiBase.value });
    toast.success(__("Settings updated"));
  },
  onError(error: { message?: string } = {}) {
    toast.error(error.message ?? __("Failed to save chatbot settings"));
  },
});

const isDirty = computed(() => JSON.stringify({ e: enabled.value, a: apiBase.value }) !== initial.value);

const embedUrl = computed(() => window.location.origin + "/helpdesk/chatbot-widget");
const embedCode = computed(() => '<iframe src="' + embedUrl.value + '" width="400" height="600" frameborder="0" allow="clipboard-write"></iframe>');

function save() {
  saveResource.submit();
}

async function copy() {
  try {
    await navigator.clipboard.writeText(embedCode.value);
    toast.success(__("Embed code copied"));
  } catch {
    toast.error(__("Failed to copy. Select and copy manually."));
  }
}

watch(isDirty, (v) => {
  disableSettingModalOutsideClick.value = v;
});
</script>
