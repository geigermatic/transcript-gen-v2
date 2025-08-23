# Chat Window Behavior Prompt (for Cursor)

## Goal

Reproduce ChatGPT-like chat window behavior in React + TypeScript.

## Requirements

### Layout

-   Message list grows downward, newest at bottom.
-   Input stays fixed at bottom, outside viewport.

### Scrolling

-   Define "at bottom":
    `scrollHeight - (scrollTop + clientHeight) <= 24px`.
-   If at bottom when new content arrives → auto-scroll to bottom.
-   If not at bottom → do not jump; show "Jump to latest" button
    bottom-right.

### Jump to Latest

-   Button appears only when new content arrives and user not at bottom.
-   On click → smooth scroll to bottom, re-enable auto-stick.

### Streaming

-   While assistant message streams:
    -   If auto-stick → stay pinned to bottom as height grows.
    -   If not auto-stick → viewport doesn't move, show "Jump to
        latest".

### New Message Divider

-   Show "New messages" pill divider when user not at bottom and new
    content arrives.
-   Remove once user scrolls to bottom or clicks "Jump to latest".

### Virtualization & Performance

-   Use `react-virtuoso` (preferred) or `@tanstack/react-virtual`.
-   Handle long text, code blocks, and images without scroll jank.

### Scroll Anchoring

-   Track anchor element (top-most visible message + offset).
-   After layout changes (images load, code highlight), adjust scrollTop
    so anchor stays fixed.
-   If at bottom, just snap to bottom.

### Mobile Behavior

-   Pull-to-scroll works as normal.
-   "Jump to latest" pill floats bottom-right.
-   Keyboard open shouldn't break scroll logic.

### Accessibility

-   Message list: `role="log"`, `aria-live="polite"` only when at
    bottom.
-   Each message: `role="listitem"`, with label like "Assistant
    message".

### Types

``` ts
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  status?: 'pending' | 'error' | 'done';
};

type ChatViewportProps = {
  messages: ChatMessage[];
  streamingMessageId?: string;
  onJumpToLatest?: () => void;
};
```

### Pseudo Scroll Logic

``` ts
const BOTTOM_THRESHOLD = 24;

function handleScroll(e) {
  const el = e.currentTarget;
  const atBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) <= BOTTOM_THRESHOLD;
  setIsAtBottom(atBottom);
  if (atBottom) {
    setShowJumpToLatest(false);
    setShowNewDivider(null);
  }
}

function onContentAppended(kind: 'user' | 'assistant' | 'stream') {
  if (isAtBottom) scrollToBottom();
  else {
    setShowJumpToLatest(true);
    if (kind !== 'stream') setShowNewDivider(lastVisibleMessageId);
  }
}

function jumpToLatest() {
  scrollToBottom({ behavior: 'smooth' });
  setShowJumpToLatest(false);
  setShowNewDivider(null);
}
```

------------------------------------------------------------------------

## Acceptance Criteria

-   Auto-stick at bottom when streaming if user is at bottom.
-   No auto-jump if user has scrolled up; show "Jump to latest".
-   Divider shows where new messages start when scrolled up.
-   Images/code reflow doesn't shift viewport unexpectedly.
-   Smooth scroll unless reduced motion is enabled.
