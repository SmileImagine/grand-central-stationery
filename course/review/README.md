# Review queue

Pieces taken out of circulation until a teacher has reviewed their words,
titles or context for the classroom (racism, sexual or violent references,
drugs and alcohol, and religious content a school may want to know about).
A piece here is not on the practice board, in the library or in the tune
workshop. Nothing in it has been censored: each file keeps the piece exactly
as it was, with the review notes added at the top.

Each `items/<id>.abc` begins with:

```text
% review-id: the piece's id
% review-from: published | holding | samples   where it came from, and where a restore puts it back
% review-status: pending | keep | change | remove
% review-categories: racism, violence, sexual, substances, religious, context
% review-findings: what is there, quoted where it is in the words
% review-suggestion: Claude's suggestion (2026-11-10); the decision is the teacher's
% review-decision: the teacher's decision and any change made
% review-set-entry: the published entry's catalogue fields as one line of JSON (published pieces only)
% review-samples-file: the file in course/samples that holds it (sample tunes only)
```

The rest of the file is the piece's ABC; a piece from the tune workshop keeps
its `holding-` and `dossier-` lines.

After changing an item, run `node course/review/build.js`, then
`node course/build-sets.js` (or `make sets`, which runs both). Open
`course/review/board.html` from a served copy of the repository to read the
queue.

To put a piece back as it was:

```bash
node course/review/build.js --restore <id>
```

A published piece goes back into `course/set.json` at its old place with its
catalogue fields; a workshop piece goes back to `course/holding/items/`. A
sample tune never left its file in `course/samples/` (moving it would renumber
the ids of the tunes after it); while it is in the queue, `course/analyze-cli.js`
leaves it out of any set it builds, and so it does for any queued piece whose
source is in `course/samples/`, and restoring it lets the builder grade it again. Make
any change to the words first (and say so in `review-decision`), then restore.
