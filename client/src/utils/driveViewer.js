export const toDriveViewerUrl = (url) => {
  if (!url) return "";
  const encoded = encodeURIComponent(url);
  return `https://drive.google.com/viewerng/viewer?embedded=true&url=${encoded}`;
};
