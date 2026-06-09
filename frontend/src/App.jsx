import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { resolveInitialTheme } from "@/lib/theme";
import LandingPage from "@/pages/LandingPage";
import NotFoundPage from "@/pages/NotFoundPage";
import CentralDocsWorkspace from "@/components/workspace/CentralDocsWorkspace";

/** Track the active theme by observing the `.dark` class so the Toaster matches. */
function useDocumentTheme() {
  const [isDark, setIsDark] = useState(() => resolveInitialTheme() === "dark");
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark ? "dark" : "light";
}

export default function App() {
  const theme = useDocumentTheme();
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/workspace" element={<CentralDocsWorkspace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster theme={theme} position="bottom-right" richColors closeButton />
    </>
  );
}
