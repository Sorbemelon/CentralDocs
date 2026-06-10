import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { generateDocumentFromChat } from "@/services/chatApi";
import {
  isLocalChatId,
  normalizeDocument,
  validateGeneratedFilename,
  validateGeneratedInstruction,
} from "./workspaceData";
import { GENERATED_DEFAULT_FILENAME, GENERATED_DOC_STEPS } from "@/data/demoCopy";

/**
 * Generate Document state for the active chat. Owns the modal form and submits
 * to POST /chats/:id/generated-documents. Online/chat/inputs are read from a ref
 * so the submit stays stable. The workspace handles list/usage updates via
 * onGenerated(doc, res); this hook keeps the success result for the modal.
 */
export function useGeneratedDocuments({ online, activeChatId, onGenerated }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [filename, setFilename] = useState(GENERATED_DEFAULT_FILENAME);
  const [includeReferences, setIncludeReferences] = useState(true);
  const [includeCurrentSelectedDocuments, setIncludeCurrentSelectedDocuments] = useState(true);
  const [genStep, setGenStep] = useState(null);

  const ref = useRef({});
  useEffect(() => {
    ref.current = {
      online,
      activeChatId,
      onGenerated,
      instruction,
      filename,
      includeReferences,
      includeCurrentSelectedDocuments,
    };
  });

  const mounted = useRef(true);
  const stepTimer = useRef(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, []);

  const startSteps = () => {
    let i = 0;
    setGenStep(GENERATED_DOC_STEPS[0]);
    stepTimer.current = setInterval(() => {
      i = Math.min(i + 1, GENERATED_DOC_STEPS.length - 2); // hold near the end during the wait
      setGenStep(GENERATED_DOC_STEPS[i]);
    }, 800);
  };
  const stopSteps = () => {
    if (stepTimer.current) {
      clearInterval(stepTimer.current);
      stepTimer.current = null;
    }
    setGenStep(null);
  };

  const openGenerateModal = useCallback(() => {
    setGenerationError(null);
    setModalOpen(true);
  }, []);

  const clearGeneratedResult = useCallback(() => setGeneratedResult(null), []);

  const closeGenerateModal = useCallback(() => {
    setModalOpen(false);
    setGenerationError(null);
    // After a successful generation, reset the form so the next open is fresh.
    setGeneratedResult((prev) => {
      if (prev) {
        setInstruction("");
        setFilename(GENERATED_DEFAULT_FILENAME);
      }
      return null;
    });
  }, []);

  const generateDocument = useCallback(async () => {
    const {
      online: on,
      activeChatId: chatId,
      onGenerated: cb,
      instruction: ins,
      filename: fn,
      includeReferences: ir,
      includeCurrentSelectedDocuments: ic,
    } = ref.current;

    const insV = validateGeneratedInstruction(ins);
    const fnV = validateGeneratedFilename(fn);

    if (!on) {
      toast.error("Backend is offline. Generation requires the backend.");
      return;
    }
    if (!chatId || isLocalChatId(chatId)) {
      toast.error("Open a saved chat to generate a document.");
      return;
    }
    if (!insV.valid) {
      setGenerationError(insV.error);
      return;
    }
    if (!fnV.valid) {
      setGenerationError(fnV.error);
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedResult(null);
    startSteps();
    try {
      const res = await generateDocumentFromChat(chatId, {
        instruction: insV.value,
        filename: fnV.value,
        includeReferences: ir,
        includeCurrentSelectedDocuments: ic,
      });
      if (!mounted.current) return;
      const doc = normalizeDocument(res.document);
      setGeneratedResult({
        document: doc,
        download: res.download || null,
        warnings: res.generation?.warnings || [],
      });
      cb?.(doc, res); // workspace: applyDocument + reload + usage merge
      toast.success(`Generated ${doc.title}`);
    } catch (err) {
      if (mounted.current) setGenerationError(err?.message || "Couldn't generate the document.");
      toast.error(err?.message || "Couldn't generate the document.");
    } finally {
      if (mounted.current) {
        stopSteps();
        setIsGenerating(false);
      }
    }
  }, []);

  return {
    modalOpen,
    isGenerating,
    generationError,
    generatedResult,
    instruction,
    filename,
    includeReferences,
    includeCurrentSelectedDocuments,
    genStep,
    setModalOpen,
    openGenerateModal,
    closeGenerateModal,
    setInstruction,
    setFilename,
    setIncludeReferences,
    setIncludeCurrentSelectedDocuments,
    validateGeneratedFilename,
    validateGeneratedInstruction,
    generateDocument,
    clearGeneratedResult,
  };
}
