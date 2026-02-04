import { getAllNews } from "@/actions/news/news";
import { NewsManageClient } from "@/components/news/news-manage-client";
import { requireHROrAdmin } from "@/actions/auth/dal";
import { redirect } from "next/navigation";

export default async function NewsManagePage() {
  const data = await requireHROrAdmin();
  if (!data) {
    redirect("/news");
  }

  const articles = await getAllNews();

  return (
    <div className="p-2 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Manage News</h2>
            <p className="text-sm text-muted-foreground">
              Create, edit, and manage news articles for the organization.
            </p>
          </div>
        </div>
      </div>
      <NewsManageClient articles={articles} />
    </div>
  );
}
