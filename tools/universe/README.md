# ZEROCAPS Universe

Cinematic 3D visualization of the ZeroCaps codebase knowledge graph (graphify output).
Standalone dev tool — deliberately **not** part of the product frontend so the locked
Next.js dependency set stays untouched.

## Run

```bash
cd tools/universe
npm install
npm run dev        # http://localhost:5199
```

Reads `../../graphify-out/{graph.json, manifest.json, .graphify_labels.json, GRAPH_REPORT.md}`
at runtime via a Vite middleware. Re-run `/graphify` to refresh the data; just reload the page.

## Controls

- **Drag** orbit · **Scroll** zoom · **Click** fly to node + detail panel
- **Cmd/Ctrl+K** search · **ESC** reset view · **Legend click** fly to cluster
