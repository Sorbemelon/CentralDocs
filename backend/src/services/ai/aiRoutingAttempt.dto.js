import { AI_ACTION_TYPE, AI_ROUTING_STATUS } from "../../constants/ai.constants.js";
import { EMBEDDING_MODEL } from "../../constants/embedding.constants.js";

export function toAiRoutingAttemptDto({
  actionType = AI_ACTION_TYPE.EMBEDDING,
  model = EMBEDDING_MODEL,
  keySlot = null,
  status = AI_ROUTING_STATUS.FAILED,
  errorType = null,
  isRateLimit = false,
  isTransient = false,
  isRetryable = false,
  fallbackLevel = 0,
} = {}) {
  return {
    actionType,
    model,
    keySlot: Number.isInteger(keySlot) ? keySlot : null,
    status,
    errorType,
    isRateLimit: Boolean(isRateLimit),
    isTransient: Boolean(isTransient),
    isRetryable: Boolean(isRetryable),
    fallbackLevel,
  };
}
