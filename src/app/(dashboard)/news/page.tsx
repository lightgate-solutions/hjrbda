import { getPublishedNews } from "@/actions/news/news";
import { NewsListClient } from "@/components/news/news-list-client";

export default async function NewsPage() {
  const articles = await getPublishedNews();

  return (
    <div className="p-2 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Company News</h2>
            <p className="text-sm text-muted-foreground">
              Stay updated with the latest announcements and news from HJRBDA.
            </p>
          </div>
        </div>
      </div>
      <NewsListClient articles={articles} />
    </div>
  );
}
