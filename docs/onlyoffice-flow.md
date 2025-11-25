# OnlyOffice Integration Flow

## 1. High-Level Architecture
- **Frontend (`src/App.jsx`)**
  - Accepts either a local DOC/DOCX upload or a remote URL.
  - Manages document metadata (title, key, file type) and passes them into `OnlyOfficeEditor`.
  - Handles modes (edit/view), permissions, and feature toggles before invoking the editor component.

- **Editor Shell (`src/components/OnlyOfficeEditor.jsx`)**
  - Wraps `@onlyoffice/document-editor-react`.
  - Builds the config object and renders the OnlyOffice iframe.
  - Owns editor lifecycle (generates `editorId`, destroys instances during cleanup) to prevent “instance already exists” errors when switching documents.

- **Upload API (`server/index.js`)**
  - Uses Express + Multer to store uploads (`/api/uploads`).
  - Returns a public URL that the document server should fetch.
  - Offers `DELETE /api/uploads/:uploadId` for cleanup.

- **OnlyOffice Document Server**
  - Currently running with `JWT_Enabled=false` (see §4).
  - Hosts the editing UI (configured via `DocumentEditor`).

## 2. End-to-End Flow
1. **User picks a file (local)**
   - `handleFilePick` validates extension (`.doc`/`.docx`).
   - Deletes any previous upload (`DELETE /api/uploads/:id`), clears editor state, waits 200 ms to guarantee unmount, and uploads the new file.
   - Backend saves the file, returns `{ uploadId, documentKey, url, originalName }`.
   - Frontend updates `documentUrl`, `documentKey`, and related state, triggering `OnlyOfficeEditor`.

2. **User provides a remote URL**
   - Similar clearing logic; instead of uploading, the URL is used directly.
   - The app synthesizes a new `documentKey` via `crypto.randomUUID`.

3. **Editor initialization**
   - `OnlyOfficeEditor` computes a unique `editorId = onlyoffice-${documentKey}-${timestamp}`.
   - Builds the ONLYOFFICE config: `document`, `permissions`, `editorConfig`, and event hooks (`onDocumentStateChange`, `onRequestSaveAs`, etc.).
   - React renders `<DocumentEditor id={editorId} ... />`.
   - The wrapper library injects `api.js`, waits for `window.DocsAPI`, and calls `new DocsAPI.DocEditor(editorId, config)`.

4. **Editor teardown**
   - Whenever `editorId` changes or the component unmounts, we locate the previous instance via `window.DocEditor.instances[id]`, call `destroyEditor()`, and delete the slot. This prevents the “Skip loading. Instance already exists …” error that appears if an old instance lingers.

## 3. Upload URL vs. Editor Fetch
The upload service returns URLs like `http://host.docker.internal:5174/uploads/<id>.docx`. These URLs are:
- Reachable from the **browser** (user can download by clicking).
- **Not always reachable from the Document Server container**, so the editor may fail to load the document even though the browser can download it.

Action items / troubleshooting:
1. Ensure the Document Server can access the host machine via `host.docker.internal` (works only on Docker Desktop for Mac/Windows).
2. If Document Server runs in Linux or another host, expose the upload server on an address reachable from that container (e.g., `http://<HOST_IP>:5174/uploads/...`).
3. Check the Document Server logs for `document could not be downloaded` errors; these indicate the configured URL cannot be fetched from the server’s network context.

## 4. JWT Configuration (Critical for Production)
- Current setup runs the Document Server with `JWT_Enabled=false`. This means the editor calls are **not authenticated**; anyone with the URL could load arbitrary documents.
- For production:
  1. Enable JWT in the Document Server (`JWT_ENABLED=true`, configure `JWT_SECRET`).
  2. Update the frontend to pass `token` (and optionally `tokenUrl`) inside the config:
     ```js
     const config = {
       document: { … },
       editorConfig: { … },
       token: jwtTokenFromBackend,
     };
     ```
  3. The backend (or a proxy) must mint JWTs containing the document metadata (key, permissions) and hand them to the frontend.
  4. OnlyOffice will reject requests without valid tokens once JWT is enabled.

## 5. Detailed Lifecycle Notes
1. **State clearing**  
   `App.jsx` resets `documentUrl/documentKey` before setting new values. The `OnlyOfficeEditor` listens to those changes and removes the previous config with a short delay to let React unmount the iframe cleanly.

2. **Instance destruction**  
   - The cleanup effect ensures `destroyEditor()` runs for every prior `editorId`.  
   - After destroying, the entry is deleted: `window.DocEditor.instances[id] = undefined;`.
   - This behavior is essential when users upload multiple documents in one session or toggle between remote URLs and local uploads.

3. **Permissions & customization**  
   - `chat` is now specified under `document.permissions` to avoid the “Obsolete: chat parameter …” warning.
   - Download/print toggles wire into both the permission block and the UI customization.

4. **Error handling**  
   - Upload errors are surfaced in the sidebar.
   - Document loading errors surface via `onLoadComponentError`.
   - Destroy operations log warnings but do not block the UI.

## 6. Known Issues / Next Steps
| Issue | Impact | Next Step |
| --- | --- | --- |
| Upload URL reachable in browser but not by Document Server | Editor fails to load document | Expose uploads on a network path accessible to the Document Server container or serve via reverse proxy accessible from the DS network |
| JWT disabled | Anyone can call editor without auth | Enable JWT, emit tokens via backend, and pass `token` into the editor config |
| Manual cleanup required for uploads | Orphaned files in `/uploads` | Implement TTL or a cleanup job if needed |

## 7. Operational Checklist
1. Start Upload API (`npm run server` or equivalent) and ensure it listens on the address the Document Server can reach.
2. Start Vite app (`npm run dev`) to render the frontend.
3. Verify Document Server (Docker) is running, with `ONLYOFFICE_HTTPS` and `JWT` configured per environment.
4. Load the app, upload a DOCX, confirm:
   - Upload API returns 201 with URL.
   - Editor loads the document.
   - Removing the document destroys the editor instance (no “Skip loading” log).
5. Repeat with remote URL to validate the clearing logic.
6. In production, repeat tests with JWT enabled to verify authenticated load succeeds.

---
This document reflects the current implementation (JWT off) and the required steps to harden the deployment. Share it with devops/infra so they can expose the upload service correctly and enable JWT before going live.


