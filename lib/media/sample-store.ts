/** Browser-local fictional sandbox uploads. IndexedDB holds bytes; JSON drafts hold stable references. */
const database = () => new Promise<IDBDatabase>((resolve, reject) => { const req = indexedDB.open("bg2-sample-showcase", 1); req.onupgradeneeded = () => req.result.createObjectStore("files"); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
export async function saveSampleMedia(file: Blob): Promise<string> { const db = await database(), id = crypto.randomUUID(); try {
    await new Promise<void>((resolve, reject) => { const tx = db.transaction("files", "readwrite"); tx.objectStore("files").put(file, id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    return "sample-media:" + id;
}
finally {
    db.close();
} }
export async function readSampleMedia(url: string): Promise<Blob> { const db = await database(); try {
    return await new Promise((resolve, reject) => { const req = db.transaction("files").objectStore("files").get(url.slice(13)); req.onsuccess = () => req.result instanceof Blob ? resolve(req.result) : reject(new Error("File not found")); req.onerror = () => reject(req.error); });
}
finally {
    db.close();
} }
