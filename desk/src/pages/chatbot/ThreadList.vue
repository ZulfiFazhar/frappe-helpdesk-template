<template>
  <div class="flex h-full w-60 flex-col border-e border-outline-gray-2 bg-surface-sidebar">
    <div class="p-2">
      <Button
        variant="subtle"
        class="w-full justify-start"
        @click="$emit('new-chat')"
      >
        <template #icon>
          <LucidePlus class="size-4" />
        </template>
        {{ __("New Chat") }}
      </Button>
    </div>
    <ScrollArea class="flex-1">
      <div class="flex flex-col gap-0.5 px-2 pb-2">
        <button
          v-for="thread in threads"
          :key="thread.thread_id"
          class="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-ink-gray-7 text-left hover:bg-surface-gray-2 transition-colors"
          :class="
            thread.thread_id === activeThreadId
              ? 'bg-surface-gray-3 text-ink-gray-9'
              : ''
          "
          @click="$emit('select', thread.thread_id)"
        >
          <LucideMessageSquare class="size-4 shrink-0 text-ink-gray-5" />
          <span class="truncate">{{ thread.thread_id }}</span>
        </button>
      </div>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { __ } from "@/translation";
import { Button, ScrollArea } from "frappe-ui";
import LucidePlus from "~icons/lucide/plus";
import LucideMessageSquare from "~icons/lucide/message-square";

defineProps<{
  threads: { thread_id: string }[];
  activeThreadId: string | null;
}>();

defineEmits<{
  select: [threadId: string];
  "new-chat": [];
}>();
</script>