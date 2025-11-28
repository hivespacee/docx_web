import React, { useEffect, useRef, useState } from "react";
import { DocumentEditor } from "@onlyoffice/document-editor-react";

const UPLOAD_API_BASE =
  import.meta.env.VITE_UPLOAD_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5174";

const OnlyOfficeEditor = ({
  documentServerUrl,
  documentUrl,
  documentTitle,
  fileType,
  documentKey,
  mode,
  allowPrint,
  allowDownload,
  enableCollaboration,
  jwtToken,
  isOffline,
  currentUserName,
  onRequestSave,
  onStateChange,
}) => {
  const saveRef = useRef(onRequestSave);
  const stateRef = useRef(onStateChange);
  const [editorConfig, setEditorConfig] = useState(null);
  const [editorId, setEditorId] = useState("");
  const [signingError, setSigningError] = useState("");

  useEffect(() => {
    saveRef.current = onRequestSave;
  }, [onRequestSave]);

  useEffect(() => {
    stateRef.current = onStateChange;
  }, [onStateChange]);

  // Reset editor state when document is cleared
  useEffect(() => {
    if (!documentUrl || !documentKey) {
      // Use a small delay to ensure proper cleanup
      const timer = setTimeout(() => {
        setEditorConfig(null);
        setEditorId("");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [documentUrl, documentKey]);

  // Helper to destroy existing ONLYOFFICE instances to avoid "instance already exists" errors
  const destroyEditorInstance = (id) => {
    if (!id) return;

    const instance = window?.DocEditor?.instances?.[id];
    if (instance?.destroyEditor) {
      try {
        instance.destroyEditor(); 
      } catch (error) {
        console.warn(`[OnlyOffice] Failed to destroy editor ${id}`, error);
      } finally {
        if (window?.DocEditor?.instances) {
          window.DocEditor.instances[id] = undefined;
        }
      }
    }
  };

  // Destroy the editor whenever the id changes or the component unmounts
  useEffect(() => {
    return () => {
      destroyEditorInstance(editorId);
    };
  }, [editorId]);

  // Initialize editor when document is available
  useEffect(() => {
    if (!documentUrl || !documentKey) {
      setSigningError("");
      return;
    }

    const newEditorId = `onlyoffice-${documentKey}-${Date.now()}`;

    const baseConfig = {
      documentType: "word",
      width: "100%",
      height: "100%",
      document: {
        fileType: fileType || "docx",
        key: documentKey,
        title: documentTitle || "Untitled Document",
        url: documentUrl,
        permissions: {
          edit: mode === "edit",
          download: allowDownload,
          print: allowPrint,
          review: enableCollaboration,
          comment: enableCollaboration,
          chat: enableCollaboration,
        },
      },
      editorConfig: {
        mode,
        lang: "en",
        collaboration: {
          mode: enableCollaboration ? "fast" : "strict",
          change: enableCollaboration,
        },
        customization: {
          print: allowPrint,
          download: allowDownload,
          comments: enableCollaboration,
          autosave: true,
          help: true,
          hideRightMenu: false,
          toolbarNoTabs: false,
        },
        user: {
          id: "user-1",
          name: "OnlyOffice User",
          group: enableCollaboration ? "Editors" : "Viewer",
        },
      },
      events: {
        onDocumentStateChange: (event) => {
          stateRef.current?.(event.data);
        },
        onRequestSaveAs: (event) => {
          saveRef.current?.(event.data);
        },
        onError: (event) => {
          console.error("ONLYOFFICE editor error", event);
        },
      },
    };

    let cancelled = false;
    let timer;

    const prepareConfig = async () => {
      try {
        let finalConfig = baseConfig;

        if (jwtToken) {
          const response = await fetch(
            `${UPLOAD_API_BASE}/api/onlyoffice/token`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwtToken}`,
              },
              body: JSON.stringify({ config: baseConfig }),
            }
          );

          if (!response.ok) {
            const errorPayload = await response.json().catch(() => null);
            throw new Error(
              errorPayload?.message ||
                "Unable to secure document with JWT token."
            );
          }

          const data = await response.json();
          finalConfig = {
            ...baseConfig,
            token: data.token,
          };
          // console.log(data.token)
        }

        if (cancelled) return;

        setSigningError("");
        timer = setTimeout(() => {
          if (cancelled) return;
          setEditorConfig(finalConfig);
          setEditorId(newEditorId);
        }, 150);
      } catch (error) {
        console.error("Failed to prepare OnlyOffice editor", error);
        if (!cancelled) {
          setEditorConfig(null);
          setEditorId("");
          setSigningError(
            error.message ||
              "Unable to prepare secure editor session. Please try again."
          );
        }
      }
    };

    prepareConfig();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    documentUrl,
    documentKey,
    documentTitle,
    fileType,
    mode,
    allowPrint,
    allowDownload,
    enableCollaboration,
    jwtToken,
  ]);
//  console.log(documentKey);
  if (!documentServerUrl) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
        Set the Document Server URL to start.
      </div>
    );
  }

  if (!editorConfig || !editorId) {
    if (signingError) {
      return (
        <div className="flex h-[calc(100vh-2rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 p-8 text-center text-red-600">
          <p className="text-lg font-semibold">Unable to load secure editor</p>
          <p className="mt-2 text-sm text-red-500">{signingError}</p>
          <p className="mt-4 text-xs text-red-400">
            Try reloading the document or signing in again.
          </p>
        </div>
      );
    }
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
        Select a document to load the editor.
      </div>
    );
  }

  return (
    <div 
      className="relative h-[calc(100vh-2rem)] overflow-hidden rounded-2xl shadow-2xl shadow-slate-900/10"
      key={editorId}
    >
      {isOffline && (
        <div className="absolute inset-x-4 top-4 z-10 rounded-xl border border-amber-300/60 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-900 shadow">
          {currentUserName || "You"} appear offline. Collaborators will see you as
          disconnected until the connection recovers.
        </div>
      )}
      <DocumentEditor
        key={editorId}
        id={editorId}
        documentServerUrl={documentServerUrl}
        config={editorConfig}
        onLoadComponentError={(code, description) =>
          console.error("ONLYOFFICE loader error", code, description)
        }
      />
    </div>
  );
};

export default OnlyOfficeEditor;

