import { getRemainingLimits } from "../demo/demoUsage.service.js";

export function toRagAnswerResponseDto({
  chat,
  userMessage,
  assistantMessage,
  references = [],
  usage = {},
} = {}) {
  return {
    chat,
    userMessage,
    assistantMessage,
    references,
    usage,
    remaining: getRemainingLimits({ usage }),
  };
}
