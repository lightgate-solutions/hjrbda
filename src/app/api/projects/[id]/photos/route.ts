import { db } from "@/db";
import {
  employees,
  projectMembers,
  projectPhotos,
  projectPhotoTags,
  projects,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse, after, type NextRequest } from "next/server";
import { createNotification } from "@/actions/notification/notification";
import { getUser } from "@/actions/auth/dal";
import { checkProjectAccess } from "@/lib/project-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    const hasAccess = await checkProjectAccess(projectId, user.id, isAdmin);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 },
      );
    }

    const url = new URL(_request.url);
    const milestoneId = url.searchParams.get("milestoneId");
    const category = url.searchParams.get("category");
    const page = Number(url.searchParams.get("page") || "1");
    const limit = Number(url.searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const conditions = [eq(projectPhotos.projectId, projectId)];

    if (milestoneId) {
      conditions.push(eq(projectPhotos.milestoneId, Number(milestoneId)));
    }
    if (
      category &&
      [
        "progress",
        "completion",
        "inspection",
        "incident",
        "asset",
        "other",
      ].includes(category)
    ) {
      conditions.push(
        eq(
          projectPhotos.category,
          category as
            | "progress"
            | "completion"
            | "inspection"
            | "incident"
            | "asset"
            | "other",
        ),
      );
    }

    const rows = await db
      .select({
        id: projectPhotos.id,
        projectId: projectPhotos.projectId,
        milestoneId: projectPhotos.milestoneId,
        uploadedBy: projectPhotos.uploadedBy,
        fileUrl: projectPhotos.fileUrl,
        fileKey: projectPhotos.fileKey,
        fileName: projectPhotos.fileName,
        fileSize: projectPhotos.fileSize,
        mimeType: projectPhotos.mimeType,
        latitude: projectPhotos.latitude,
        longitude: projectPhotos.longitude,
        accuracy: projectPhotos.accuracy,
        category: projectPhotos.category,
        note: projectPhotos.note,
        capturedAt: projectPhotos.capturedAt,
        createdAt: projectPhotos.createdAt,
        uploaderName: employees.name,
      })
      .from(projectPhotos)
      .leftJoin(employees, eq(projectPhotos.uploadedBy, employees.id))
      .where(and(...conditions))
      .orderBy(desc(projectPhotos.capturedAt))
      .limit(limit)
      .offset(offset);

    // Fetch tags for all photos
    const photoIds = rows.map((r) => r.id);
    let tagsMap: Record<number, string[]> = {};
    if (photoIds.length > 0) {
      const tags = await db
        .select({
          photoId: projectPhotoTags.photoId,
          tag: projectPhotoTags.tag,
        })
        .from(projectPhotoTags)
        .where(
          sql`${projectPhotoTags.photoId} IN (${sql.join(
            photoIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );

      tagsMap = tags.reduce(
        (acc, t) => {
          if (!acc[t.photoId]) acc[t.photoId] = [];
          acc[t.photoId].push(t.tag);
          return acc;
        },
        {} as Record<number, string[]>,
      );
    }

    const photos = rows.map((r) => ({
      ...r,
      tags: tagsMap[r.id] || [],
    }));

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectPhotos)
      .where(and(...conditions));

    return NextResponse.json({
      photos,
      pagination: {
        page,
        limit,
        total: Number(countResult.count),
        totalPages: Math.ceil(Number(countResult.count) / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching photos:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch photos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    const hasAccess = await checkProjectAccess(projectId, user.id, isAdmin);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { photos: photosData } = body ?? {};

    if (!Array.isArray(photosData) || photosData.length === 0) {
      return NextResponse.json(
        { error: "At least one photo is required" },
        { status: 400 },
      );
    }

    // Filter valid photos and batch insert
    const validPhotos = photosData.filter(
      (photo: {
        fileUrl?: string;
        fileKey?: string;
        fileName?: string;
        mimeType?: string;
      }) => photo.fileUrl && photo.fileKey && photo.fileName && photo.mimeType,
    );

    if (validPhotos.length === 0) {
      return NextResponse.json(
        { error: "No valid photos to upload" },
        { status: 400 },
      );
    }

    const insertedPhotos = await db
      .insert(projectPhotos)
      .values(
        validPhotos.map(
          (photo: {
            fileUrl: string;
            fileKey: string;
            fileName: string;
            fileSize?: number;
            mimeType: string;
            latitude?: number;
            longitude?: number;
            accuracy?: number;
            category?: string;
            note?: string;
            capturedAt?: string;
            milestoneId?: string | number;
          }) => ({
            projectId,
            milestoneId: photo.milestoneId ? Number(photo.milestoneId) : null,
            uploadedBy: user.id,
            fileUrl: photo.fileUrl,
            fileKey: photo.fileKey,
            fileName: photo.fileName,
            fileSize: Number(photo.fileSize) || 0,
            mimeType: photo.mimeType,
            latitude: photo.latitude ? String(photo.latitude) : null,
            longitude: photo.longitude ? String(photo.longitude) : null,
            accuracy: photo.accuracy ? String(photo.accuracy) : null,
            category: (photo.category || "other") as
              | "progress"
              | "completion"
              | "inspection"
              | "incident"
              | "asset"
              | "other",
            note: photo.note || null,
            capturedAt: new Date(photo.capturedAt || Date.now()),
          }),
        ),
      )
      .returning();

    // Batch insert all tags
    const allTags = validPhotos.flatMap(
      (photo: { tags?: string[] }, index: number) => {
        if (!Array.isArray(photo.tags) || photo.tags.length === 0) return [];
        return photo.tags.map((tag: string) => ({
          photoId: insertedPhotos[index].id,
          tag: tag.trim(),
        }));
      },
    );

    if (allTags.length > 0) {
      await db.insert(projectPhotoTags).values(allTags);
    }

    const createdPhotos = insertedPhotos.map((photo, index) => ({
      ...photo,
      tags: validPhotos[index].tags || [],
    }));

    // Send notifications after response
    after(async () => {
      const [project] = await db
        .select({
          supervisorId: projects.supervisorId,
          name: projects.name,
          code: projects.code,
        })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (project) {
        const photoCount = createdPhotos.length;
        const message = `${user.name} uploaded ${photoCount} photo${photoCount > 1 ? "s" : ""} to project ${project.name} (${project.code})`;

        const notificationPromises: Promise<unknown>[] = [];

        if (project.supervisorId && project.supervisorId !== user.id) {
          notificationPromises.push(
            createNotification({
              user_id: project.supervisorId,
              title: "New Project Photos",
              message,
              notification_type: "message",
              reference_id: projectId,
            }),
          );
        }

        const members = await db
          .select({ employeeId: projectMembers.employeeId })
          .from(projectMembers)
          .where(eq(projectMembers.projectId, projectId));

        for (const member of members) {
          if (
            member.employeeId !== user.id &&
            member.employeeId !== project.supervisorId
          ) {
            notificationPromises.push(
              createNotification({
                user_id: member.employeeId,
                title: "New Project Photos",
                message,
                notification_type: "message",
                reference_id: projectId,
              }),
            );
          }
        }

        await Promise.all(notificationPromises);
      }
    });

    return NextResponse.json({ photos: createdPhotos }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating photos:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create photos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    const hasAccess = await checkProjectAccess(projectId, user.id, isAdmin);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { id: photoId } = body ?? {};
    if (!photoId) {
      return NextResponse.json(
        { error: "Photo id is required" },
        { status: 400 },
      );
    }

    // Fetch photo to verify ownership
    const [photo] = await db
      .select()
      .from(projectPhotos)
      .where(
        and(
          eq(projectPhotos.projectId, projectId),
          eq(projectPhotos.id, Number(photoId)),
        ),
      )
      .limit(1);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Only uploader, project creator, or admin can delete
    const [project] = await db
      .select({
        creatorId: projects.creatorId,
        supervisorId: projects.supervisorId,
        name: projects.name,
        code: projects.code,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const canDelete =
      isAdmin || photo.uploadedBy === user.id || project?.creatorId === user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: "You do not have permission to delete this photo" },
        { status: 403 },
      );
    }

    // Delete from R2
    try {
      await fetch(`${new URL(request.url).origin}/api/r2/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: photo.fileKey }),
      });
    } catch (r2Error) {
      console.error("Error deleting from R2:", r2Error);
    }

    // Delete DB record (tags cascade)
    await db.delete(projectPhotos).where(eq(projectPhotos.id, Number(photoId)));

    // Send notification after response
    after(async () => {
      if (project?.supervisorId && project.supervisorId !== user.id) {
        await createNotification({
          user_id: project.supervisorId,
          title: "Project Photo Deleted",
          message: `${user.name} deleted a photo from project ${project.name} (${project.code})`,
          notification_type: "message",
          reference_id: projectId,
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting photo:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
