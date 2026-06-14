export async function shareOrDownloadImage({
  blob,
  fileName,
  title = "历史学姐笔记",
  navigatorRef = globalThis.navigator,
  documentRef = globalThis.document,
  urlRef = globalThis.URL,
  FileCtor = globalThis.File,
  scheduleCleanup = (callback) => globalThis.setTimeout(callback, 1_000)
}) {
  if (
    FileCtor &&
    typeof navigatorRef?.share === "function" &&
    typeof navigatorRef?.canShare === "function"
  ) {
    const file = new FileCtor([blob], fileName, {
      type: blob.type || "image/png"
    });
    const shareData = {
      files: [file],
      title
    };

    if (navigatorRef.canShare(shareData)) {
      try {
        await navigatorRef.share(shareData);
        return "shared";
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return "cancelled";
        }
      }
    }
  }

  if (!documentRef?.body || !urlRef?.createObjectURL) {
    throw new Error("Image download is not supported in this browser.");
  }

  const imageUrl = urlRef.createObjectURL(blob);
  const link = documentRef.createElement("a");

  link.href = imageUrl;
  link.download = fileName;
  documentRef.body.appendChild(link);
  link.click();
  link.remove();
  scheduleCleanup(() => urlRef.revokeObjectURL(imageUrl));

  return "downloaded";
}
