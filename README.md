# Swans Medical Timeline

Turn a medical-events spreadsheet into a clear, visual treatment timeline for personal-injury cases.

Load the bundled sample cases or upload any Excel/CSV in the standard format
(`Encounter Date`, `Primary Provider`, `Facility`, `Body Parts`, `Medicine Type`,
`Record Type`, `Summary`, `Link To Pdf`) and get an interactive timeline with a
crash-date marker, key-milestones rail, pre/post-crash view, grouping, filtering,
an anatomical heatmap, AI summaries/Q&A, and courtroom PDF/PowerPoint exports.

## Run locally
It is a static site - no build step. Open `index.html` in a browser, or serve the
folder with any static server (e.g. `npx serve`).

## Deploy
Static site. On Vercel, framework preset is **Other**, no build command, output
directory is the repo root.

## Submission notes
- **Data:** All processing is client-side in the browser. Uploaded files and edits
  are never sent to a server and are lost on refresh unless you use **Save**
  (browser `localStorage`).
- **AI:** Optional. Q&A and drafting run offline by default; paste a Gemini API key
  in the AI Assistant tab to enable live AI. Assumes a Gemini API key for live mode.
- **Cost per case:** ~$0 offline. With live AI, a typical case is a few Gemini calls
  (well under $0.05/case at current pricing).
- **Crash date:** Not part of the medical records - the attorney adds it in Case Setup.
