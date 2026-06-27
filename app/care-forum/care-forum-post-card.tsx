"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ProfileAvatar from "@/components/profile-avatar";

export type ForumComment = {
  name: string;
  body: string;
};

export type ForumPost = {
  title: string;
  category: string;
  summary: string;
  readTime: string;
  comments: ForumComment[];
};

export type CaregiverAuthor = {
  full_name: string;
  profile_photo_url: string | null;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CareForumPostCard({
  post,
  author,
  featured = false,
}: {
  post: ForumPost;
  author: CaregiverAuthor;
  featured?: boolean;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  useEffect(() => {
    if (!commentsOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCommentsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [commentsOpen]);

  return (
    <>
      <article
        className={`flex h-full flex-col rounded-lg border p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-medium)] ${
          featured
            ? "border-[var(--btn-secondary-border)] bg-[var(--signal)] text-[var(--foreground)]"
            : "border-[var(--line)] bg-[var(--panel-strong)] text-[var(--foreground)]"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase">
          <span
            className={`rounded-full px-3 py-1 ${
              featured ? "bg-white text-[var(--brand)]" : "bg-[var(--accent-soft)] text-[var(--brand)]"
            }`}
          >
            {post.category}
          </span>
          <span className={featured ? "text-[var(--brand)]" : "text-[var(--muted)]"}>{post.readTime}</span>
        </div>

        <h3 className="mt-4 text-xl font-extrabold leading-snug">{post.title}</h3>
        <p className={`mt-3 flex-1 text-sm leading-6 ${featured ? "text-[var(--brand)]" : "text-[var(--muted)]"}`}>
          {post.summary}
        </p>

        <div className="mt-5 flex items-center gap-3 border-t border-[var(--line)] pt-4">
          <ProfileAvatar
            src={author.profile_photo_url}
            alt={`${author.full_name} profile`}
            fallbackText={getInitials(author.full_name) || "CG"}
            className="h-11 w-11 shrink-0 rounded-full border border-[var(--line)] bg-white"
            imageClassName="object-top"
          />
          <div className="min-w-0">
            <p className={`text-xs font-bold ${featured ? "text-[var(--brand)]" : "text-[var(--muted)]"}`}>
              Shared by
            </p>
            <p className="truncate text-sm font-extrabold text-[var(--foreground)]">{author.full_name}</p>
          </div>
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="ml-auto rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-bold text-[var(--brand)] transition hover:bg-[var(--accent-soft)]"
          >
            View comments
          </button>
        </div>
      </article>

      {commentsOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#12060e]/75 px-4 py-8 backdrop-blur-md"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`comments-title-${post.title.replace(/[^a-zA-Z0-9]/g, "-")}`}
            >
              <button
                type="button"
                className="absolute inset-0"
                aria-label="Close comments"
                onClick={() => setCommentsOpen(false)}
              />

              <section className="relative z-10 max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-[var(--shadow-strong)]">
                <button
                  type="button"
                  onClick={() => setCommentsOpen(false)}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-sm font-extrabold text-[var(--brand)] transition hover:bg-[var(--accent-soft)]"
                  aria-label="Close comments"
                >
                  X
                </button>

                <div className="pr-12">
                  <p className="text-xs font-extrabold uppercase text-[var(--brand)]">{post.category}</p>
                  <h2
                    id={`comments-title-${post.title.replace(/[^a-zA-Z0-9]/g, "-")}`}
                    className="mt-2 text-2xl font-extrabold leading-tight text-[var(--foreground)]"
                  >
                    {post.title}
                  </h2>
                  <div className="mt-4 flex items-center gap-3">
                    <ProfileAvatar
                      src={author.profile_photo_url}
                      alt={`${author.full_name} profile`}
                      fallbackText={getInitials(author.full_name) || "CG"}
                      className="h-10 w-10 shrink-0 rounded-full border border-[var(--line)] bg-white"
                      imageClassName="object-top"
                    />
                    <div>
                      <p className="text-xs font-bold text-[var(--muted)]">Shared by</p>
                      <p className="text-sm font-extrabold text-[var(--foreground)]">{author.full_name}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-[var(--line)] pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-extrabold text-[var(--foreground)]">Comments</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-bold text-[var(--brand)] transition hover:bg-[var(--accent-soft)]"
                      >
                        Add comment
                      </button>
                      <p className="text-xs font-bold text-[var(--muted)]">{post.comments.length} replies</p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {post.comments.map((comment) => (
                      <div
                        key={`${post.title}-${comment.name}`}
                        className="rounded-lg border border-[var(--line)] bg-white/80 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-extrabold text-[var(--foreground)]">{comment.name}</p>
                          <button
                            type="button"
                            className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-bold text-[var(--brand)] transition hover:bg-[var(--accent-soft)]"
                          >
                            Reply
                          </button>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{comment.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>,
          document.body,
        )
        : null}
    </>
  );
}
