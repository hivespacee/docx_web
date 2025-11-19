import React, { useEffect, useMemo, useState } from 'react';
import OnlyOfficeEditor from './components/OnlyOfficeEditor.jsx';

const ACCEPTED_TYPES = '.doc,.docx';
const DEFAULT_DOCUMENT_SERVER = 'http://localhost:8080';

const randomKey = () =>
  window.crypto?.randomUUID?.() ??
  `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getFileType = (name = '') => {
  const match = name.split('.').pop();
  return match ? match.toLowerCase() : 'docx';
};

const App = () => {
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [fileType, setFileType] = useState('docx');
  const [documentKey, setDocumentKey] = useState('');
  const [documentServerUrl, setDocumentServerUrl] = useState(
    DEFAULT_DOCUMENT_SERVER,
  );
  const [mode, setMode] = useState('edit');
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [enableCollaboration, setEnableCollaboration] = useState(true);
  const [lastSaveEvent, setLastSaveEvent] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [localFileUrl, setLocalFileUrl] = useState('');
  const [remoteUrlInput, setRemoteUrlInput] = useState('');
  const [uploadError, setUploadError] = useState('');

  const summary = useMemo(
    () => [
      `Document: ${documentTitle || 'No document selected'}`,
      `Mode: ${mode === 'edit' ? 'Full editing' : 'View only'}`,
      `Print: ${allowPrint ? 'enabled' : 'disabled'}`,
      `Download: ${allowDownload ? 'enabled' : 'disabled'}`,
      `Collaboration: ${enableCollaboration ? 'real-time' : 'solo'}`,
      `State: ${isDirty ? 'Unsaved changes' : 'Synced'}`,
      `Document Server: ${documentServerUrl ? documentServerUrl : 'not configured'
      }`,
    ],
    [
      allowDownload,
      allowPrint,
      documentServerUrl,
      documentTitle,
      enableCollaboration,
      isDirty,
      mode,
    ],
  );

  const handleSaveRequest = (saveEvent) => {
    setLastSaveEvent({
      timestamp: new Date().toISOString(),
      data: saveEvent,
    });
    setIsDirty(false);
  };

  const handleStateChange = (hasChanges) => {
    setIsDirty(Boolean(hasChanges));
  };

  const handleFilePick = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      return;
    }
    if (!selected.name.toLowerCase().endsWith('.docx') && !selected.name.toLowerCase().endsWith('.doc')) {
      setUploadError('ONLYOFFICE demo server reliably opens DOC/DOCX files. Other formats may fail.');
    }
    else {
      setUploadError('');
    }
    if (localFileUrl) {
      URL.revokeObjectURL(localFileUrl);
    }
    const objectUrl = URL.createObjectURL(selected);
    setLocalFileUrl(objectUrl);
    setDocumentUrl(objectUrl);
    setDocumentTitle(selected.name);
    setFileType(getFileType(selected.name));
    setDocumentKey(randomKey());
    setRemoteUrlInput('');
  };

  const applyRemoteUrl = () => {
    if (!remoteUrlInput) {
      return;
    }
    if (localFileUrl) {
      URL.revokeObjectURL(localFileUrl);
      setLocalFileUrl('');
    }
    setDocumentUrl(remoteUrlInput);
    setFileType(getFileType(remoteUrlInput));
    setDocumentTitle(remoteUrlInput.split('/').pop() || 'Remote document');
    setDocumentKey(randomKey());
    setUploadError('');
  };

  const clearDocument = () => {
    if (localFileUrl) {
      URL.revokeObjectURL(localFileUrl);
      setLocalFileUrl('');
    }
    setDocumentUrl('');
    setDocumentTitle('');
    setFileType('docx');
    setDocumentKey('');
    setRemoteUrlInput('');
    setLastSaveEvent(null);
    setIsDirty(false);
  };

  useEffect(() => {
    return () => {
      if (localFileUrl) {
        URL.revokeObjectURL(localFileUrl);
      }
    };
  }, [localFileUrl]);

  const fieldLabelClass =
    'flex flex-col gap-2 text-sm font-semibold text-slate-200';
  const inputClass =
    'rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400';
  const panelCardClass =
    'rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20';
  const toggleButtonBase =
    'rounded-full border px-4 py-2 text-sm font-semibold transition-colors';

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[360px,1fr]">
        <aside className="flex flex-col gap-6 bg-slate-950/95 p-6 text-slate-100 lg:p-8">
          <section className={`${panelCardClass} flex flex-col gap-4`}>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Document Server
              </p>
              <p className="text-lg font-semibold">Connection settings</p>
            </div>
            <label className={fieldLabelClass}>
              <span>Document Server URL</span>
              <input
                type="url"
                value={documentServerUrl}
                onChange={(event) => setDocumentServerUrl(event.target.value)}
                placeholder="http://localhost:8080"
                className={inputClass}
              />
            </label>
          </section>

          <section className={`${panelCardClass} flex flex-col gap-4`}>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Document source
              </p>
              <p className="text-lg font-semibold">Load a DOC/DOCX file</p>
            </div>
            <label className={fieldLabelClass}>
              <span>Select from device</span>
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFilePick}
                className="text-sm text-slate-100 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-900 hover:file:bg-sky-400"
              />
            </label>
            <div className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              or
            </div>
            <label className={fieldLabelClass}>
              <span>Paste a publicly reachable URL</span>
              <input
                type="url"
                value={remoteUrlInput}
                onChange={(event) => setRemoteUrlInput(event.target.value)}
                placeholder="https://storage.example.com/contract.docx"
                className={inputClass}
              />
              <button
                type="button"
                onClick={applyRemoteUrl}
                disabled={!remoteUrlInput}
                className="mt-2 inline-flex items-center justify-center rounded-xl bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Use this URL
              </button>
            </label>
            {documentUrl && (
              <button
                type="button"
                onClick={clearDocument}
                className="rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-white/40"
              >
                Remove current document
              </button>
            )}
            {uploadError && (
              <p className="text-sm font-medium text-amber-300">{uploadError}</p>
            )}
          </section>

          <section className={`${panelCardClass} flex flex-col gap-4`}>
            <label className={fieldLabelClass}>
              <span>Active document URL</span>
              <input
                type="url"
                value={documentUrl}
                placeholder="No document selected yet"
                readOnly
                className={`${inputClass} cursor-not-allowed`}
              />
            </label>

            <label className={fieldLabelClass}>
              <span>Document title</span>
              <input
                type="text"
                value={documentTitle}
                onChange={(event) => setDocumentTitle(event.target.value)}
                className={inputClass}
              />
            </label>
          </section>

          <section className={`${panelCardClass} flex flex-col gap-4`}>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-200">Mode</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`${toggleButtonBase} ${
                    mode === 'edit'
                      ? 'border-sky-400 bg-sky-400 text-slate-900'
                      : 'border-white/20 bg-white/5 text-slate-100'
                  }`}
                  onClick={() => setMode('edit')}
                >
                  Full editing
                </button>
                <button
                  type="button"
                  className={`${toggleButtonBase} ${
                    mode === 'view'
                      ? 'border-sky-400 bg-sky-400 text-slate-900'
                      : 'border-white/20 bg-white/5 text-slate-100'
                  }`}
                  onClick={() => setMode('view')}
                >
                  View only
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={allowPrint}
                onChange={(event) => setAllowPrint(event.target.checked)}
                className="h-4 w-4 rounded border-white/40 bg-white/10 text-sky-400 focus:ring-sky-400"
              />
              Allow printing
            </label>

            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(event) => setAllowDownload(event.target.checked)}
                className="h-4 w-4 rounded border-white/40 bg-white/10 text-sky-400 focus:ring-sky-400"
              />
              Allow download/export
            </label>

            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={enableCollaboration}
                onChange={(event) => setEnableCollaboration(event.target.checked)}
                className="h-4 w-4 rounded border-white/40 bg-white/10 text-sky-400 focus:ring-sky-400"
              />
              Enable real-time collaboration
            </label>
          </section>

          <section className={`${panelCardClass} space-y-3`}>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Session summary
              </p>
            </div>
            <ul className="space-y-1 text-sm text-slate-100/80">
              {summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {lastSaveEvent ? (
              <div className="rounded-lg bg-slate-900/60 p-3 text-sm">
                <p className="font-semibold text-white">Last save</p>
                <p className="text-slate-300">
                  {new Date(lastSaveEvent.timestamp).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No save callbacks yet</p>
            )}
          </section>
        </aside>

        <main className="bg-slate-100 p-4 lg:p-8">
          <div className="h-full rounded-3xl bg-white p-4 shadow-2xl shadow-slate-900/10">
            <OnlyOfficeEditor
              documentServerUrl={documentServerUrl}
              documentTitle={documentTitle}
              documentUrl={documentUrl}
              mode={mode}
              allowPrint={allowPrint}
              allowDownload={allowDownload}
              enableCollaboration={enableCollaboration}
              onRequestSave={handleSaveRequest}
              onStateChange={handleStateChange}
              fileType={fileType}
              documentKey={documentKey}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;