import test from "node:test";
import assert from "node:assert/strict";

const MODULE_URL = new URL("../src/lib/imageShare.js", import.meta.url);

test("shares the generated image through the native share sheet when supported", async () => {
  const { shareOrDownloadImage } = await import(MODULE_URL);
  const sharedPayloads = [];
  const navigatorRef = {
    canShare: ({ files }) => files.length === 1,
    share: async (payload) => sharedPayloads.push(payload)
  };
  const FileCtor = class {
    constructor(parts, name, options) {
      this.parts = parts;
      this.name = name;
      this.type = options.type;
    }
  };

  const result = await shareOrDownloadImage({
    blob: { type: "image/png" },
    fileName: "history-note.png",
    navigatorRef,
    FileCtor
  });

  assert.equal(result, "shared");
  assert.equal(sharedPayloads.length, 1);
  assert.equal(sharedPayloads[0].files[0].name, "history-note.png");
});

test("downloads the generated image when native file sharing is unavailable", async () => {
  const { shareOrDownloadImage } = await import(MODULE_URL);
  const link = {
    clickCount: 0,
    click() {
      this.clickCount += 1;
    },
    remove() {}
  };
  const appended = [];
  const revoked = [];
  const documentRef = {
    body: {
      appendChild(node) {
        appended.push(node);
      }
    },
    createElement(tagName) {
      assert.equal(tagName, "a");
      return link;
    }
  };
  const urlRef = {
    createObjectURL: () => "blob:history-note",
    revokeObjectURL: (value) => revoked.push(value)
  };

  const result = await shareOrDownloadImage({
    blob: { type: "image/png" },
    fileName: "history-note.png",
    navigatorRef: {},
    documentRef,
    urlRef,
    scheduleCleanup: (callback) => callback()
  });

  assert.equal(result, "downloaded");
  assert.equal(link.href, "blob:history-note");
  assert.equal(link.download, "history-note.png");
  assert.equal(link.clickCount, 1);
  assert.deepEqual(appended, [link]);
  assert.deepEqual(revoked, ["blob:history-note"]);
});

test("falls back to downloading when the native share sheet rejects the request", async () => {
  const { shareOrDownloadImage } = await import(MODULE_URL);
  const link = {
    clickCount: 0,
    click() {
      this.clickCount += 1;
    },
    remove() {}
  };
  const documentRef = {
    body: {
      appendChild() {}
    },
    createElement: () => link
  };
  const urlRef = {
    createObjectURL: () => "blob:share-fallback",
    revokeObjectURL() {}
  };
  const FileCtor = class {
    constructor(parts, name, options) {
      this.parts = parts;
      this.name = name;
      this.type = options.type;
    }
  };
  const shareError = new Error("Share permission expired");

  shareError.name = "NotAllowedError";

  const result = await shareOrDownloadImage({
    blob: { type: "image/png" },
    fileName: "history-note.png",
    navigatorRef: {
      canShare: () => true,
      share: async () => {
        throw shareError;
      }
    },
    documentRef,
    urlRef,
    FileCtor,
    scheduleCleanup: (callback) => callback()
  });

  assert.equal(result, "downloaded");
  assert.equal(link.clickCount, 1);
});
