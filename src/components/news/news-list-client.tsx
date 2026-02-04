"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pin, MessageSquare, Eye, Paperclip, Newspaper } from "lucide-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import type { NewsArticle } from "@/actions/news/news";

interface NewsListClientProps {
  articles: NewsArticle[];
}

export function NewsListClient({ articles }: NewsListClientProps) {
  const router = useRouter();

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-3">
        <Newspaper className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No news articles published yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <Card
          key={article.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/news/${article.id}`)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg line-clamp-2">
                {article.title}
              </CardTitle>
              {article.isPinned && (
                <Pin className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              By {article.authorName} •{" "}
              {dayjs(article.publishedAt).format("MMM D, YYYY")}
            </p>
          </CardHeader>
          <CardContent>
            {article.excerpt && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {article.excerpt}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {article.viewCount}
              </span>
              {article.commentsEnabled && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {article.commentCount}
                </span>
              )}
              {article.attachments.length > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {article.attachments.length}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
