#!/bin/bash
# Grand Central Stationery: serve this folder locally and open the cells page.
# Double-click in Finder. Needed because browsers block a page opened from a
# file:// path from fetching the piano samples; everything else works offline too.
# With Node installed, serve.js also lets the tune editor (course/editor.html)
# save records; python3 or php serve the pages read-only.
cd "$(dirname "$0")"
PORT=8765
URL="http://localhost:$PORT/index.html"
if command -v node >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  echo "Serving $(pwd) at $URL  (the tune editor can save; close this window to stop)"
  node serve.js "$PORT"
elif command -v python3 >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  echo "Serving $(pwd) at $URL  (read-only: install Node to save from the tune editor; close this window to stop)"
  python3 -m http.server "$PORT" --bind 127.0.0.1
elif command -v php >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  php -S "127.0.0.1:$PORT"
else
  echo "Neither node, python3 nor php was found. Open the .html files directly; only playback needs a server."
  open "index.html"
fi
