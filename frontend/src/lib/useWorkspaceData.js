import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SOURCE_FILTER, SOURCE_KIND } from "./constants";
import { listFolders } from "@/services/folderApi";
import { listDocuments } from "@/services/documentApi";
import { listTrash } from "@/services/trashApi";
import { normalizeDocument, normalizeFolder, normalizeTrash } from "./workspaceData";
import {
  FALLBACK_DOCUMENTS,
  FALLBACK_FOLDERS,
  FALLBACK_GENERATED,
  FALLBACK_TRASH,
} from "@/data/mockWorkspaceFallback";

/**
 * Sources data (folders/documents/trash). Seeds from bootstrap when present,
 * otherwise lists from the backend; falls back to mock data when offline or on
 * error (previous/fallback state is preserved on failure).
 */
export function useWorkspaceData({ online, bootstrap, filter }) {
  const [folders, setFolders] = useState(FALLBACK_FOLDERS);
  const [documents, setDocuments] = useState(FALLBACK_DOCUMENTS);
  const [trash, setTrash] = useState(FALLBACK_TRASH);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadActive = useCallback(
    async ({ force = false } = {}) => {
      if (!online) {
        setFolders(FALLBACK_FOLDERS);
        setDocuments(FALLBACK_DOCUMENTS);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [foldersRes, documentsRes] = await Promise.all([listFolders(), listDocuments()]);
        const rawFolders = foldersRes.folders;
        const rawDocuments = documentsRes.documents;
        if (mounted.current) {
          setFolders((rawFolders || []).map(normalizeFolder));
          setDocuments((rawDocuments || []).map(normalizeDocument));
        }
      } catch (err) {
        if (mounted.current) {
          setError(err);
          if (!force && bootstrap?.folders && bootstrap?.documents) {
            setFolders((bootstrap.folders || []).map(normalizeFolder));
            setDocuments((bootstrap.documents || []).map(normalizeDocument));
          }
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [online, bootstrap],
  );

  const loadTrash = useCallback(async () => {
    if (!online) {
      setTrash(FALLBACK_TRASH);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listTrash();
      if (mounted.current) setTrash(normalizeTrash(res));
    } catch (err) {
      if (mounted.current) setError(err);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [online]);

  useEffect(() => {
    if (filter === SOURCE_FILTER.trash) loadTrash();
    else loadActive();
  }, [filter, loadActive, loadTrash]);

  // Upsert a single normalized document (immediate reflect after upload/retry).
  const applyDocument = useCallback((doc) => {
    if (!doc?.id) return;
    setDocuments((prev) => {
      const idx = prev.findIndex((d) => d.id === doc.id);
      if (idx === -1) return [doc, ...prev];
      const next = prev.slice();
      next[idx] = { ...next[idx], ...doc };
      return next;
    });
  }, []);

  const generated = useMemo(() => {
    if (!online) return FALLBACK_GENERATED;
    const fromDocs = documents.filter((d) => d.source === SOURCE_KIND.generated);
    return fromDocs.length ? fromDocs : [];
  }, [online, documents]);

  return {
    folders,
    documents,
    trash,
    generated,
    loading,
    error,
    applyDocument,
    reloadActive: () => loadActive({ force: true }),
    reloadTrash: loadTrash,
  };
}
