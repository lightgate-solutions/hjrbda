import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "hjrbda-photos";
const STORE_NAME = "pending-uploads";
const PROJECTS_STORE = "cached-projects";
const DB_VERSION = 2;

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

export interface CachedProject {
  id: number;
  name: string;
  code: string;
  status: string;
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
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
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

// Cached projects for offline project selection
export async function setCachedProjects(
  projects: CachedProject[],
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(PROJECTS_STORE, "readwrite");
  await tx.store.clear();
  for (const project of projects) {
    await tx.store.put(project);
  }
  await tx.done;
}

export async function getCachedProjects(): Promise<CachedProject[]> {
  const db = await getDb();
  return db.getAll(PROJECTS_STORE);
}

// Fetch projects from API and cache in IndexedDB for offline use
export async function syncProjectsToCache(): Promise<CachedProject[]> {
  const response = await fetch(
    "/api/projects?limit=100&sortBy=name&sortDirection=asc",
    { credentials: "include" },
  );
  if (!response.ok) throw new Error("Failed to fetch projects");
  const data = await response.json();
  const projects: CachedProject[] = data.projects.map(
    (p: { id: number; name: string; code: string; status: string }) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status,
    }),
  );
  await setCachedProjects(projects);
  return projects;
}
