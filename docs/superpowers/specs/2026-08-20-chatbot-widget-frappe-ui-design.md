# Chatbot Widget — Reuse Main Chatbot UI Components

**Date:** 2026-08-20
**Status:** Approved (brainstormed)
**Scope:** Make the embeddable chatbot widget (`ChatbotWidget.vue`) reuse the exact same Frappe UI components as the main chatbot page (`Chatbot.vue`), so both look and behave identically.

## Context

The main chatbot page (`desk/src/pages/chatbot/Chatbot.vue`) renders chat via two shared components:

- `ChatInput.vue` — textarea with auto-grow, Send button, and a Stop button while streaming. Emits `send` and `stop`.
- `ChatMessage.vue` — message bubble; renders markdown for `ai` role (via `marked` + `DOMPurify`), shows a "Thinking..." spinner while loading, and auto-scrolls the container with `id="chatbot-messages"`.

The main page drives these with the `useChatStream` composable (`desk/src/composables/useChatStream.ts`), which supports an `AbortController` (needed by the Stop button) and uses roles `@@"human" | "ai"`.

The embeddable widget (`desk/src/pages/chatbot/ChatbotWidget.vue`) currently does NOT reuse these components. It renders its own inline `Textarea` + `Button` and inline message bubbles, and uses a separate `useChat` composable (`desk/src/pages/chatbot/composables/useChat.ts`) with roles `@@"user" | "assistant"`. This makes the widget look and behave differently from the main page.

## Decision

Reuse the exact same components and composable as the main page (Option A):

- `ChatInput.vue`
- `ChatMessage.vue`
- `useChatStream` composable

This makes the widget visually and behaviorally identical to the main chatbot page (including markdown rendering and the Stop button), at the cost of the widget inheriting those behaviors.

## Changes

### `desk/src/pages/chatbot/ChatbotWidget.vue` (edit)

1. Replace the inline `Textarea` + `Button` input row with:
   ```vue
   <ChatInput :is-streaming="isStreaming" @send="onSend" @stop="onStop" />
   ```
2. Replace the inline message bubbles with:
   ```vue
   <ChatMessage
     v-for="msg in messages"
     :key="msg.id"
     :role="msg.role"
     :content="msg.content"
     :is-loading="isStreaming && msg.role === 'ai' && !msg.content"
   />
   ```
3. Give the message list container `id="chatbot-messages"` and `bg-surface-gray-1` so `ChatMessage` auto-scroll works and the background matches the main page.
4. Switch the data layer from `useChat` to `useChatStream` (same as the main page):
   - Roles become `@@"human" | "ai"`.
   - Add an `AbortController` for the Stop button.
   - `onSend(input)` pushes a `human` message + empty `ai` message, streams tokens into the last `ai` message, and handles errors with toasts.
   - `onStop()` aborts the controller and clears `isStreaming`.
5. Keep the widget-specific chrome: header with brand name (fallback `__("Helpdesk Assistant")`) + Reset button, and the settings-loading logic (`chatbot_enabled` / `chatbot_api_url` / `brand_name` via `frappe.client.get`).
6. Keep the disabled / not-configured placeholder states.

### Unchanged files

- `desk/src/pages/chatbot/ChatInput.vue` — reused as-is.
- `desk/src/pages/chatbot/ChatMessage.vue` — reused as-is.
- `desk/src/composables/useChatStream.ts` — reused as-is.
- `desk/src/pages/chatbot/composables/useChat.ts` — no longer used by the widget. Left in place (not deleted) to avoid unrelated churn; may be removed later if unused.

## Data Flow

1. Widget mounts → loads HD Settings (`chatbot_enabled`, `chatbot_api_url`, `brand_name`).
2. If disabled or unconfigured → placeholder message.
3. Else renders `ChatMessage` list + `ChatInput`.
4. User types → `ChatInput` emits `send` → `onSend` streams via `useChatStream` → tokens appended to last `ai` message → `ChatMessage` renders markdown live.
5. User clicks Stop → `ChatInput` emits `stop` → `onStop` aborts the stream.

## Error Handling

- Stream network/parse error → stop streaming, keep partial message, toast error (same messages as main page).
- Abort (Stop) → silently stop, no error toast.

## Testing

- No frontend test framework in the repo (consistent with existing chatbot code).
- Manual verification: embed the widget, send a message, confirm markdown renders and Stop works; compare visually with the main chatbot page.

## File Manifest

| File | Action | Purpose |
|---|---|---|
| `desk/src/pages/chatbot/ChatbotWidget.vue` | Edit | Reuse `ChatInput` + `ChatMessage` + `useChatStream`. |

## Out of Scope

- Deleting the now-unused `useChat.ts` composable.
- Adding a thread list to the widget.
- Changing `ChatInput.vue` / `ChatMessage.vue` / `useChatStream.ts`.
