import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { semanticSearch } from "@/services/searchApi";
import { normalizeSearchResponse } from "./workspaceData";

/** Search scope chips (frontend id → label). */
export const SEARCH_SCOPE_OPTIONS = Object.freeze([
  { id: "current_context", label: "Current context" },
  { id: "all_demo", label: "All demo docs" },
  { id: "uploaded", label: "Uploaded" },
  { id: "generated", label: "Generated" },
]);

const DEFAULT_TOP_K = 6;

function buildPayload(query, scope, topK, sel) {
  const base = { query, topK };
  if (scope === "current_context") {
    return {
      ...base,
      scope: "all",
      selectedDocumentIds: sel.docIds,
      selectedFolderIds: sel.folderIds,
    };
  }
  if (scope === "uploaded") return { ...base, scope: "user" };
  if (scope === "generated") return { ...base, scope: "generated" };
  return { ...base, scope: "all" }; // all_demo
}

/**
 * Semantic search state machine. Defaults to the active chat's selected context.
 * Backend selection/online are read from a ref so runSearch stays stable.
 */
export function useSemanticSearch({ online, selectedDocumentIds = [], selectedFolderIds = [] }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("current_context");
  const [topK] = useState(DEFAULT_TOP_K);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [references, setReferences] = useState([]);
  const [stats, setStats] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [lastQuery, setLastQuery] = useState("");
  const [lastScope, setLastScope] = useState(null);

  const propsRef = useRef({ online, selectedDocumentIds, selectedFolderIds });
  useEffect(() => {
    propsRef.current = { online, selectedDocumentIds, selectedFolderIds };
  });

  const runSearch = useCallback(
    async (queryArg, scopeArg) => {
      const q = String(queryArg ?? query).trim();
      const sc = scopeArg ?? scope;
      if (!q) return;

      const { online: on, selectedDocumentIds: docIds, selectedFolderIds: folderIds } = propsRef.current;
      if (!on) {
        toast.error("Backend is offline. Search requires the backend.");
        return;
      }
      if (sc === "current_context" && !docIds.length && !folderIds.length) {
        toast("Select a document or folder first, or switch scope to All demo docs.");
        return;
      }

      setIsSearching(true);
      setError(null);
      try {
        const res = await semanticSearch(buildPayload(q, sc, topK, { docIds, folderIds }));
        const norm = normalizeSearchResponse(res);
        setResults(norm.results);
        setReferences(norm.references);
        setStats(norm.stats);
        setWarnings(norm.warnings);
        setLastQuery(q);
        setLastScope(sc);
      } catch (err) {
        setError(err);
        setResults([]);
        setReferences([]);
        setStats(null);
        setWarnings([]);
        toast.error(err?.message || "Search failed");
      } finally {
        setIsSearching(false);
      }
    },
    [query, scope, topK],
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setReferences([]);
    setStats(null);
    setWarnings([]);
    setError(null);
    setLastQuery("");
    setLastScope(null);
  }, []);

  const useSampleQuestion = useCallback(
    (q) => {
      setQuery(q);
      runSearch(q);
    },
    [runSearch],
  );

  return {
    query,
    scope,
    topK,
    isSearching,
    error,
    results,
    references,
    stats,
    warnings,
    lastQuery,
    lastScope,
    setQuery,
    setScope,
    runSearch,
    clearSearch,
    useSampleQuestion,
  };
}
