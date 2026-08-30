import { createServerFn } from "@tanstack/react-start";
import { TELEGRAM_BOT_USERNAME } from "~/openrouter/constants";

export const getTelegramBot = createServerFn().handler(async () => {
  return TELEGRAM_BOT_USERNAME;
});
