import { getNewsArticle } from "@/actions/news/news";
import { NewsArticleClient } from "@/components/news/news-article-client";
import { BackButton } from "@/components/ui/back-button";
import { notFound } from "next/navigation";

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getNewsArticle(id);

  if (!article) {
    notFound();
  }

  return (
    <div className="p-2 space-y-4">
      <div className="flex items-start gap-4">
        <BackButton label="Back to News" href="/news" />
        <div>
          <h2 className="text-2xl font-bold mb-2">{article.title}</h2>
        </div>
      </div>
      <NewsArticleClient article={article} />
    </div>
  );
}
