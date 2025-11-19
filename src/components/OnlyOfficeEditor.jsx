import React, { useMemo } from 'react';
import { DocumentEditor } from '@onlyoffice/document-editor-react';

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
  const config = useMemo(() => {
    if (!documentUrl || !documentKey) {
      return null;
    }

    return {
      documentType: 'word',
      width: '100%',
      height: '100%',
      document: {
        fileType: fileType || 'docx',
        key: documentKey,
        title: documentTitle || 'Untitled Document',
        url: documentUrl,
        permissions: {
          edit: mode === 'edit',
          download: allowDownload,
          print: allowPrint,
          review: enableCollaboration,
          comment: enableCollaboration,
        },
      },
      editorConfig: {
        mode,
        lang: 'en',
        collaboration: {
          mode: enableCollaboration ? 'fast' : 'strict',
          change: enableCollaboration,
        },
        customization: {
          print: allowPrint,
          download: allowDownload,
          chat: enableCollaboration,
          comments: enableCollaboration,
          help: true,
          hideRightMenu: false,
          toolbarNoTabs: false,
        },
        user: {
          id: 'user-1',
          name: 'OnlyOffice User',
          group: enableCollaboration ? 'Editors' : 'Viewer',
        },
      },
      events: {
        onDocumentStateChange: (event) => {
          onStateChange?.(event.data);
        },
        onRequestSaveAs: (event) => {
          onRequestSave?.(event.data);
        },
        onError: (event) => {
          console.error('ONLYOFFICE editor error', event);
        },
      },
    };
  }, [
    allowDownload,
    allowPrint,
    documentKey,
    documentTitle,
    documentUrl,
    enableCollaboration,
    fileType,
    mode,
    onRequestSave,
    onStateChange,
  ]);

  if (!documentServerUrl) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
        Set the Document Server URL to start.
      </div>
    );
  }

  if (!documentUrl || !documentKey || !config) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
        Select a document to load the editor.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden rounded-2xl shadow-2xl shadow-slate-900/10">
      <DocumentEditor
        id={`onlyoffice-${documentKey}`}
        documentServerUrl={documentServerUrl}
        config={config}
        onLoadComponentError={(code, description) => {
          console.error('ONLYOFFICE loader error', code, description);
        }}
      />
    </div>
  );
};

export default OnlyOfficeEditor;

