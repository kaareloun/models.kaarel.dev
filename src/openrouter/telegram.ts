import fs from "node:fs";
import { TELEGRAM_API_URL, TELEGRAM_CHATS_FILE } from "./constants";
import type { EnrichedModel } from "./enrich";

type ChatInfo = { id: number; title: string; addedAt: string };

type TelegramState = {
  lastOffset: number;
  chats: ChatInfo[];
};

function readState(): TelegramState {
  try {
    const raw = JSON.parse(fs.readFileSync(TELEGRAM_CHATS_FILE, "utf-8"));
    return {
      lastOffset: typeof raw?.lastOffset === "number" ? raw.lastOffset : 0,
      chats: Array.isArray(raw?.chats)
        ? raw.chats.filter((c: ChatInfo) => typeof c?.id === "number")
        : [],
    };
  } catch {
    return { lastOffset: 0, chats: [] };
  }
}

function writeState(state: TelegramState): void {
  try {
    fs.writeFileSync(TELEGRAM_CHATS_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("Failed to write Telegram state:", error);
  }
}

function botToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

async function tgApi<T = unknown>(
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; result?: T; error_code?: number; description?: string }> {
  const response = await fetch(`${TELEGRAM_API_URL}/bot${botToken()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(40_000),
  });
  return response.json();
}

async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const res = await tgApi("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
  if (!res.ok) {
    if (res.error_code === 403) removeChat(chatId);
    throw new Error(`Telegram sendMessage failed: ${res.error_code} ${res.description}`);
  }
  return true;
}

export async function broadcastParetoNotification(
  entries: Array<{ rank: number; model: EnrichedModel }>,
): Promise<void> {
  if (!botToken() || entries.length === 0) return;

  const text = [
    `🆕 New model${entries.length > 1 ? "s" : ""} on the Pareto frontier:`,
    "",
    ...entries.map((e) => `#${e.rank} ${e.model.name}`),
    "",
    "https://models.kaarel.dev",
  ].join("\n");

  const targets = readState().chats.map((c) => c.id);
  if (targets.length === 0) {
    console.warn("Telegram: no subscribed chats yet, skipping broadcast");
    return;
  }
  console.log(`Telegram: broadcasting to ${targets.length} chat(s)`);

  for (const chatId of targets) {
    try {
      await sendTelegramMessage(chatId, text);
    } catch (error) {
      console.error(`Failed to notify Telegram chat ${chatId}:`, error);
    }
  }
}

function addChat(chat: ChatInfo): void {
  const state = readState();
  if (state.chats.some((c) => c.id === chat.id)) return;
  state.chats.push(chat);
  writeState(state);
}

function removeChat(chatId: number): void {
  const state = readState();
  const filtered = state.chats.filter((c) => c.id !== chatId);
  if (filtered.length !== state.chats.length) {
    state.chats = filtered;
    writeState(state);
  }
}

async function handleMessage(
  msg?: { chat?: { id?: number; title?: string; first_name?: string; username?: string }; text?: string },
): Promise<void> {
  const chatId = msg?.chat?.id;
  if (!chatId) return;
  const text = (msg.text ?? "").trim();

  if (text.startsWith("/stop") || text.startsWith("/unsubscribe")) {
    removeChat(chatId);
    await sendTelegramMessage(chatId, "Unsubscribed. You will no longer receive Pareto frontier updates.");
    return;
  }

  if (text.startsWith("/start") || text.startsWith("/subscribe")) {
    const title = msg.chat?.title || msg.chat?.first_name || msg.chat?.username || `chat ${chatId}`;
    addChat({ id: chatId, title, addedAt: new Date().toISOString() });
    await sendTelegramMessage(
      chatId,
      "👋 Subscribed! You'll get a message here whenever a new model appears on the Pareto frontier of https://models.kaarel.dev\n\nSend /stop to unsubscribe.",
    );
  }
}

export async function processTelegramUpdates(): Promise<void> {
  if (!botToken()) return;

  const state = readState();
  try {
    const res = await tgApi<{ update_id: number; message?: { chat?: { id?: number }; text?: string } }[]>(
      "getUpdates",
      { offset: state.lastOffset, timeout: 0, allowed_updates: ["message"] },
    );
    if (!res.ok || !Array.isArray(res.result)) {
      if (!res.ok) console.error("Telegram getUpdates failed:", res.error_code, res.description);
      return;
    }
    let offset = state.lastOffset;
    for (const update of res.result) {
      offset = update.update_id + 1;
      try {
        await handleMessage(update.message);
      } catch (error) {
        console.error("Telegram update handling failed:", error);
      }
    }
    if (offset !== state.lastOffset) {
      const current = readState();
      current.lastOffset = offset;
      writeState(current);
    }
  } catch (error) {
    console.error("Telegram update processing failed:", error);
  }
}
