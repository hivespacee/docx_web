# ONLYOFFICE DOCX POC

This Vite + React proof-of-concept embeds the `@onlyoffice/document-editor-react`
component with configurable modes (full editing vs view-only), permissions
(print/download), collaboration toggles, save callbacks, and file upload flows.

## Stack

- React 19 + Vite 7 with Tailwind styling.
- ONLYOFFICE React wrapper (`@onlyoffice/document-editor-react`).
- Lightweight Express uploader that stores DOC/DOCX files locally and exposes
  HTTP URLs the ONLYOFFICE Document Server can download.

## Running locally

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the upload API (required)**

   ```bash
   npm run server
   ```

   The server listens on `http://localhost:5174` by default, stores files in
   `/uploads`, and responds with public URLs. Set
   `PUBLIC_BASE_URL=http://host.docker.internal:5174` when running the
   ONLYOFFICE Document Server inside Docker so it can reach the host machine.

3. **Start the Vite app**

   ```bash
   npm run dev
   ```

4. **Start the ONLYOFFICE Document Server (Docker)**

   ```bash
   docker run -itd -p 8080:80 --name onlyoffice-document-server onlyoffice/documentserver
   ```

   Use `http://localhost:8080` (or your remote server) in the UI’s “Document
   Server URL” field.

## Configuration

- `PUBLIC_BASE_URL` (server): absolute base URL exposed to ONLYOFFICE (e.g.
  `http://host.docker.internal:5174`).
- `UPLOAD_PORT` (server): override default 5174.
- `VITE_UPLOAD_API_URL` (client): override upload API origin; defaults to
  `http://localhost:5174`.

## Workflow

1. User selects a DOC/DOCX file → React uploads it via `/api/uploads`.
2. Upload API stores the file (e.g. `uploads/uuid.docx`) and returns
   `{ url, documentKey, uploadId }`.
3. React feeds `url` + `documentKey` to the ONLYOFFICE component.
4. ONLYOFFICE Document Server downloads the file from the upload URL, applies
   the chosen configuration (mode, permissions, collaboration), and emits save /
   dirty callbacks back to React.

When removing a document, the upload API is notified so temporary files do not
pile up.

## Notes

- The upload API currently allows 25 MB max and accepts `.doc` / `.docx`.
- For production you’d typically swap the local storage for object storage
  (S3, Azure, GCS) and add authentication.
