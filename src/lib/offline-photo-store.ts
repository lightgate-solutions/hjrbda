import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "hjrbda-photos";
const STORE_NAME = "pending-uploads";
const DB_VERSION = 1;

export interface PendingPhoto {
  id?: number;
  projectId: number;
  milestoneId: number | null;
  blob: ArrayBuffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  category: string;
  note: string;
  tags: string[];
  capturedAt: string;
  status: "pending" | "uploading" | "failed";
  retryCount: number;
  createdAt: string;
}

function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("projectId", "projectId", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
    },
  });
}

export async function savePhotoOffline(
  data: Omit<PendingPhoto, "id">,
): Promise<number> {
  const db = await getDb();
  const id = await db.add(STORE_NAME, data);
  return id as number;
}

export async function getPendingPhotos(): Promise<PendingPhoto[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function getPendingPhotosForProject(
  projectId: number,
): Promise<PendingPhoto[]> {
  const db = await getDb();
  return db.getAllFromIndex(STORE_NAME, "projectId", projectId);
}

export async function getPendingPhotoCount(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_NAME);
}

export async function removePendingPhoto(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function updatePhotoStatus(
  id: number,
  status: PendingPhoto["status"],
  retryCount?: number,
): Promise<void> {
  const db = await getDb();
  const photo = await db.get(STORE_NAME, id);
  if (photo) {
    photo.status = status;
    if (retryCount !== undefined) photo.retryCount = retryCount;
    await db.put(STORE_NAME, photo);
  }
}
