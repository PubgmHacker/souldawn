"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, dawnReveal, viewportOnce } from "@/lib/motion";

interface Review {
  id: string;
  text: string;
  author: string;
  username?: string;
  date: number;
  rating?: number;
  mediaType: "none" | "photo" | "video";
  mediaUrl?: string;
  mediaThumb?: string;
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <div className="flex gap-0.5 mb-3">
      {[1,2,3,4,5].map((s) => (
        <span key={s} className={s <= rating ? "text-accent" : "text-muted/30"} style={{ fontSize: 14 }}>★</span>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const [imgError, setImgError] = useState(false);
  const date = new Date(review.date * 1000).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });
  return (
    <motion.div variants={dawnReveal} className="ingot rounded-xl p-6 flex flex-col gap-4 hover-lift">
      {review.mediaType === "photo" && review.mediaUrl && !imgError && (
        <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-surface">
          <img
            src={review.mediaThumb || review.mediaUrl}
            alt="Фото отзыва"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      )}
      {review.mediaType === "video" && review.mediaUrl && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-surface">
          {review.mediaThumb && !imgError ? (
            <div className="relative w-full h-full">
              <img
                src={review.mediaThumb}
                alt="Превью"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-accent/20 backdrop-blur-sm flex items-center justify-center border border-accent/30">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#E8B87A">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <video src={review.mediaUrl} controls className="w-full h-full object-cover" preload="metadata" />
          )}
        </div>
      )}
      <StarRating rating={review.rating} />
      <p className="text-sm text-text-dim leading-relaxed flex-1">«{review.text}»</p>
      <div className="flex items-center justify-between pt-3 border-t border-line">
        <div>
          <p className="text-xs font-bold text-text">{review.author}</p>
          {review.username && <p className="text-[10px] text-muted">@{review.username}</p>}
        </div>
        <p className="text-[10px] text-muted">{date}</p>
      </div>
    </motion.div>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [channelUrl, setChannelUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews || []);
        setChannelUrl(d.channel_url || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <section className="section-padding">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1,2,3].map((i) => <div key={i} className="ingot rounded-xl p-6 h-48 animate-pulse" />)}
      </div>
    </section>
  );

  if (!reviews.length) return null;

  return (
    <section className="section-padding">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mb-12 flex items-end justify-between"
        >
          <motion.div variants={dawnReveal}>
            <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-3">Отзывы покупателей</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight uppercase">
              <span className="text-text">ЧТО </span>
              <span className="dawn-text">ГОВОРЯТ</span>
            </h2>
          </motion.div>
          {channelUrl && (
            <motion.a
              variants={dawnReveal}
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-accent hidden md:flex"
            >
              Все отзывы →
            </motion.a>
          )}
        </motion.div>

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {reviews.slice(0, 6).map((r) => <ReviewCard key={r.id} review={r} />)}
        </motion.div>

        {channelUrl && (
          <div className="mt-10 text-center md:hidden">
            <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
              Все отзывы
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
