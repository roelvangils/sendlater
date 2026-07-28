// Subject-only draft updates via the Advanced Gmail Service (raw RFC 822).
//
// GmailDraft.update() reconstructs the whole message from getPlainBody() /
// getBody(), which silently drops CC, BCC, attachments and inline images, and
// corrupts characters outside the Basic Multilingual Plane (emoji become �)
// when it re-encodes the body. Editing only the Subject header in the raw
// MIME source leaves everything else byte-for-byte identical.

function updateDraftSubjectRaw(draftId: string, newSubject: string): void {
  if (typeof Gmail === "undefined") {
    throw new Error(
      "Advanced Gmail service unavailable — check that appsscript.json lists " +
        'it under dependencies.enabledAdvancedServices and was pushed ("clasp push").'
    );
  }
  const apiDraft = Gmail.Users!.Drafts!.get("me", draftId, { format: "raw" });
  const message = apiDraft.message;
  if (!message || !message.raw) {
    throw new Error(`Draft ${draftId}: raw message unavailable`);
  }

  const bytes = Utilities.base64DecodeWebSafe(message.raw);

  // Split headers from body at the first CRLFCRLF. Only the header block is
  // ever decoded/re-encoded as text; body bytes pass through untouched, so
  // attachment and charset handling can't be disturbed.
  const splitAt = findHeaderBodySplit(bytes);
  const headerBytes = splitAt === -1 ? bytes : bytes.slice(0, splitAt);
  const bodyBytes = splitAt === -1 ? [] : bytes.slice(splitAt);

  const headerBlock = Utilities.newBlob(headerBytes).getDataAsString("UTF-8");
  const newHeaderBlock = replaceSubjectHeader(headerBlock, newSubject);
  if (newHeaderBlock === headerBlock) return;

  const newBytes = Utilities.newBlob(newHeaderBlock)
    .getBytes()
    .concat(bodyBytes);

  Gmail.Users!.Drafts!.update(
    {
      message: {
        raw: Utilities.base64EncodeWebSafe(newBytes),
        // Preserve thread membership and labels explicitly; without these the
        // updated message would come back with only the DRAFT label.
        threadId: message.threadId,
        labelIds: message.labelIds,
      },
    },
    "me",
    draftId
  );
}

function findHeaderBodySplit(bytes: number[]): number {
  for (let i = 0; i + 3 < bytes.length; i++) {
    if (
      bytes[i] === 13 &&
      bytes[i + 1] === 10 &&
      bytes[i + 2] === 13 &&
      bytes[i + 3] === 10
    ) {
      return i;
    }
  }
  return -1;
}

// Matches the full Subject header including folded continuation lines.
const SUBJECT_HEADER_REGEX = /^Subject:[^\r\n]*(?:\r?\n[ \t][^\r\n]*)*/im;

function replaceSubjectHeader(headerBlock: string, newSubject: string): string {
  const header = "Subject: " + encodeSubjectValue(newSubject);
  if (SUBJECT_HEADER_REGEX.test(headerBlock)) {
    // Function replacement: the encoded value may contain "$" sequences that
    // String.replace would otherwise interpret.
    return headerBlock.replace(SUBJECT_HEADER_REGEX, () => header);
  }
  return headerBlock.replace(/\r?\n?$/, "\r\n" + header);
}

// RFC 2047 encoded-words for non-ASCII subjects. Each word carries at most
// 39 UTF-8 bytes of payload, keeping every line — including the first, which
// also carries "Subject: " — within the 76-char limit. Chunked on code-point
// boundaries so surrogate pairs are never split.
function encodeSubjectValue(subject: string): string {
  if (/^[\x20-\x7e]*$/.test(subject)) return subject;

  const chunks: string[] = [];
  let current = "";
  for (const ch of subject) {
    if (current && utf8ByteLength(current + ch) > 39) {
      chunks.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) chunks.push(current);

  return chunks
    .map(
      (c) =>
        "=?UTF-8?B?" + Utilities.base64Encode(c, Utilities.Charset.UTF_8) + "?="
    )
    .join("\r\n ");
}

function utf8ByteLength(s: string): number {
  return Utilities.newBlob(s).getBytes().length;
}
