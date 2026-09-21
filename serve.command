#!/bin/bash
# Grand Central Stationery: serve this folder locally and open the cells page.
# Double-click in Finder. Needed because browsers block a page opened from a
# file:// path from fetching the piano samples; everything else works offline too.
cd "$(dirname "$0")"
PORT=8765
URL="http://localhost:$PORT/Grand%20Central%20Stationery%20Cells%20v1.html"
if command -v python3 >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  echo "Serving $(pwd) at $URL  (close this window to stop)"
  python3 -m http.server "$PORT" --bind 127.0.0.1
elif command -v php >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  php -S "127.0.0.1:$PORT"
else
  echo "Neither python3 nor php was found. Open the .html files directly; only playback needs a server."
  open "Grand Central Stationery Cells v1.html"
fi
