import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { generateDocumentFromChat } from "@/services/chatApi";
import {
  buildUniqueGeneratedFilename,
  documentDownloadFilename,
  isLocalChatId,
  normalizeDocument,
  validateGeneratedFilename,
  validateGeneratedInstruction,
} from "./workspaceData";
import { GENERATED_DEFAULT_FILENAME, GENERATED_DOC_STEPS } from "@/data/demoCopy";

const TEMPORARY_GENERATION_MESSAGE = "AI generation is temporarily unavailable. Please try again.";

function generationErrorMessage(error) {
  const code = error?.code || error?.error?.code;
  const status = error?.status || error?.statusCode;
  if (
    code === "GENERATION_PROVIDER_UNAVAILABLE" ||
    code === "GENERATION_PROVIDER_ERROR" ||
    status === 502 ||
    status === 503
  ) {
    return TEMPORARY_GENERATION_MESSAGE;
  }
  if (error?.offline || /timed out|timeout/i.test(error?.message || "")) {
    return "AI generation is taking too long. Please try again.";
  }
  return error?.message || "Couldn't generate the document.";
}

/**
 * Generate Document state for the active chat. Owns the modal form and submits
 * to POST /chats/:id/generated-documents. Online/chat/inputs are read from a ref
 * so the submit stays stable. The workspace handles list/usage updates via
 * onGenerated(doc, res); this hook keeps the success result for the modal.
 */
export function useGeneratedDocuments({
  online,
  activeChatId,
  existingGeneratedDocuments = [],
  onGenerated,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [filename, setFilename] = useState(GENERATED_DEFAULT_FILENAME);
  const [includeReferences, setIncludeReferences] = useState(true);
  const [includeCurrentSelectedDocuments, setIncludeCurrentSelectedDocuments] = useState(true);
  const [genStep, setGenStep] = useState(null);

  const existingFilenames = useCallback(() => {
    const filenames = existingGeneratedDocuments.map(documentDownloadFilename).filter(Boolean);
    if (generatedResult?.document) {
      const lastGenerated = documentDownloadFilename(generatedResult.document);
      if (lastGenerated) filenames.push(lastGenerated);
    }
    return filenames;
  }, [existingGeneratedDocuments, generatedResult]);

  const nextDefaultFilename = useCallback(
    () => buildUniqueGeneratedFilename(GENERATED_DEFAULT_FILENAME, existingFilenames()).value || GENERATED_DEFAULT_FILENAME,
    [existingFilenames],
  );

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
      existingGeneratedDocuments,
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
    setFilename(nextDefaultFilename());
    setModalOpen(true);
  }, [nextDefaultFilename]);

  const clearGeneratedResult = useCallback(() => setGeneratedResult(null), []);

  const closeGenerateModal = useCallback(() => {
    setModalOpen(false);
    setGenerationError(null);
    // After a successful generation, reset the form so the next open is fresh.
    setGeneratedResult((prev) => {
      if (prev) {
        setInstruction("");
        setFilename(nextDefaultFilename());
      }
      return null;
    });
  }, [nextDefaultFilename]);

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
    const fnV = buildUniqueGeneratedFilename(fn, existingFilenames());

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
      try {
        cb?.(doc, res); // workspace: applyDocument + reload + usage merge
      } catch {
        toast.warning("Document created, but the workspace list did not refresh.");
      }
      toast.success(`Generated ${doc.title}`);
    } catch (err) {
      const message = generationErrorMessage(err);
      if (mounted.current) setGenerationError(message);
      toast.error(message);
    } finally {
      if (mounted.current) {
        stopSteps();
        setIsGenerating(false);
      }
    }
  }, [existingFilenames]);

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
    resolvedFilename: buildUniqueGeneratedFilename(filename, existingFilenames()),
    generateDocument,
    clearGeneratedResult,
  };
}
