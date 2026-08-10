// Bag-scanner worker client: posts images to the scan worker and returns its response.

const BAG_SCANNER_WORKER_URL = "https://laptools-openai-worker.thelaphub.workers.dev";

function normalizeScannerBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/g, "");
}

function getBagScannerWorkerUrl() {
  return normalizeScannerBaseUrl(BAG_SCANNER_WORKER_URL);
}

async function scanBagItemsWithWorker(filesOrBaseUrl, maybeFiles, maybeOptions) {
  const usingOldSignature = typeof filesOrBaseUrl === "string";
  const files = usingOldSignature ? maybeFiles : filesOrBaseUrl;
  const options = usingOldSignature ? maybeOptions : maybeFiles;

  const list = Array.from(files || []).filter(Boolean);
  if (!list.length) throw new Error("Choose one or more screenshots first.");

  const baseUrl = getBagScannerWorkerUrl();
  if (!baseUrl) throw new Error("Scanner is not configured yet.");

  const formData = new FormData();
  list.forEach(file => formData.append("images", file));

  const debug = options && options.debug ? "?debug=1" : "";
  const res = await fetch(`${baseUrl}/scan-inventory${debug}`, {
    method: "POST",
    body: formData
  });

  let json = null;
  try { json = await res.json(); } catch (e) { json = null; }

  if (!res.ok) {
    throw new Error(json?.errorMessage || json?.error || `Scanner request failed (${res.status}).`);
  }

  return json;
}

export {
  BAG_SCANNER_WORKER_URL,
  getBagScannerWorkerUrl,
  normalizeScannerBaseUrl,
  scanBagItemsWithWorker
};

// Legacy globals
if(typeof window!=="undefined"){
  Object.assign(window,{
    BAG_SCANNER_WORKER_URL,
    getBagScannerWorkerUrl,
    normalizeScannerBaseUrl,
    scanBagItemsWithWorker
  });
}
