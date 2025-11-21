import React, { useEffect, useRef, useState } from "react";
import { DocumentEditor } from "@onlyoffice/document-editor-react";

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
  onRequestSave,
  onStateChange,
}) => {
  const saveRef = useRef(onRequestSave);
  const stateRef = useRef(onStateChange);
  const [editorConfig, setEditorConfig] = useState(null);
  const [editorId, setEditorId] = useState("");

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
      return;
    }

    const newEditorId = `onlyoffice-${documentKey}-${Date.now()}`;
    
    const config = {
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

    // Small delay to ensure previous editor is unmounted
    const timer = setTimeout(() => {
      setEditorConfig(config);
      setEditorId(newEditorId);
    }, 150);

    return () => clearTimeout(timer);
  }, [
    documentUrl,
    documentKey,
    documentTitle,
    fileType,
    mode,
    allowPrint,
    allowDownload,
    enableCollaboration,
  ]);

  if (!documentServerUrl) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
        Set the Document Server URL to start.
      </div>
    );
  }

  if (!editorConfig || !editorId) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
        Select a document to load the editor.
      </div>
    );
  }

  return (
    <div 
      className="h-[calc(100vh-2rem)] overflow-hidden rounded-2xl shadow-2xl shadow-slate-900/10"
      key={editorId}
    >
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

