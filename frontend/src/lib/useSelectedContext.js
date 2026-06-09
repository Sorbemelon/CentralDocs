import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Selected document/folder context state machine.
 * `onPersist(docIds, folderIds)` is invoked after attach/detach/clear so the
 * workspace can sync to the active backend chat (no-op when offline/local).
 * `setFromChat` hydrates from a chat's persisted selection WITHOUT re-persisting.
 */
export function useSelectedContext({ onPersist } = {}) {
  const [folderIds, setFolderIds] = useState([]);
  const [docIds, setDocIds] = useState([]);

  const onPersistRef = useRef(onPersist);
  useEffect(() => {
    onPersistRef.current = onPersist;
  });

  const docIdsRef = useRef(docIds);
  const folderIdsRef = useRef(folderIds);
  useEffect(() => {
    docIdsRef.current = docIds;
  }, [docIds]);
  useEffect(() => {
    folderIdsRef.current = folderIds;
  }, [folderIds]);

  const persist = (nextDocs, nextFolders) => {
    onPersistRef.current?.(nextDocs, nextFolders);
  };

  const attach = useCallback((kind, id, options = {}) => {
    // Guard: a document that the backend reports as not attachable (processing/failed)
    // can never enter the context, even via a stray caller.
    if (options.attachable === false) return;
    if (kind === "folder") {
      setFolderIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        persist(docIdsRef.current, next);
        return next;
      });
    } else {
      setDocIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        persist(next, folderIdsRef.current);
        return next;
      });
    }
  }, []);

  const detach = useCallback((kind, id) => {
    if (kind === "folder") {
      setFolderIds((prev) => {
        const next = prev.filter((x) => x !== id);
        persist(docIdsRef.current, next);
        return next;
      });
    } else {
      setDocIds((prev) => {
        const next = prev.filter((x) => x !== id);
        persist(next, folderIdsRef.current);
        return next;
      });
    }
  }, []);

  const clear = useCallback(() => {
    setFolderIds([]);
    setDocIds([]);
    persist([], []);
  }, []);

  const setFromChat = useCallback((selection) => {
    setDocIds(selection?.selectedDocumentIds || []);
    setFolderIds(selection?.selectedFolderIds || []);
  }, []);

  const isSelected = useCallback(
    (kind, id) => (kind === "folder" ? folderIds.includes(id) : docIds.includes(id)),
    [folderIds, docIds],
  );

  return { folderIds, docIds, attach, detach, clear, setFromChat, isSelected };
}
