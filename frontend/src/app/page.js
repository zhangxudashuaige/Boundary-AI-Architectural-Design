"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  const [shareMessage, setShareMessage] = useState("");
  const shareMessageTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (shareMessageTimerRef.current) {
        window.clearTimeout(shareMessageTimerRef.current);
      }
    };
  }, []);

  function showShareMessage(message) {
    setShareMessage(message);

    if (shareMessageTimerRef.current) {
      window.clearTimeout(shareMessageTimerRef.current);
    }

    shareMessageTimerRef.current = window.setTimeout(() => {
      setShareMessage("");
    }, 2400);
  }

  async function copyShareUrl(shareUrl) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = shareUrl;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error("Unable to copy share URL");
    }
  }

  async function handleShare() {
    const shareUrl = window.location.href;

    try {
      await copyShareUrl(shareUrl);
      showShareMessage("链接已复制，可粘贴发送");
    } catch {
      showShareMessage("复制失败，请手动复制地址栏链接");
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-black text-white">
      <Image
        src="/picture/baad-hero-background.png"
        alt="BAAD aerial architecture hero"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      <div className="absolute left-[2vw] top-[5.6vh] z-10 max-w-[52vw] font-display text-[clamp(1.15rem,1.9vw,2.15rem)] leading-none">
        Boundary AI Architectural Design
      </div>

      <div className="absolute right-[1.6vw] top-[5.4vh] z-10 max-w-[42vw] text-right text-white">
        <div className="font-sans text-[clamp(1.15rem,1.9vw,2.15rem)] font-medium leading-none">
          极光工作室
        </div>
        <div className="mt-3 font-sans text-[clamp(0.8rem,1.35vw,1.55rem)] font-medium uppercase leading-none">
          AURORA STUDIO
        </div>
      </div>

      <Link
        href="/render"
        className="absolute left-1/2 top-[65%] z-10 -translate-x-1/2 whitespace-nowrap text-center text-[clamp(2.1rem,4vw,4.5rem)] leading-none text-white transition duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        style={{ fontFamily: '"Monotype Corsiva", cursive' }}
      >
        BEGIN DESIGNING
      </Link>

      <div className="absolute bottom-[3.2vh] left-[1.8vw] z-10 flex items-center gap-3">
        <button
          type="button"
          aria-label="Share Boundary AI Architectural Design"
          title="复制链接"
          onClick={handleShare}
          className="inline-flex h-[clamp(2.7rem,3.6vw,4rem)] w-[clamp(2.7rem,3.6vw,4rem)] items-center justify-center text-white transition duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 64 64"
            className="h-full w-full"
            fill="none"
          >
            <path
              d="M27 14H14C10.7 14 8 16.7 8 20V50C8 53.3 10.7 56 14 56H44C47.3 56 50 53.3 50 50V37"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M34 10H54V30"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M54 10L26 38"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {shareMessage ? (
          <div
            role="status"
            aria-live="polite"
            className="whitespace-nowrap rounded-full border border-white/20 bg-black/55 px-4 py-2 text-sm font-medium text-white shadow-[0_10px_26px_rgba(0,0,0,0.22)] backdrop-blur"
          >
            {shareMessage}
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-[3.2vh] right-[1.7vw] z-10 text-right font-sans text-white">
        <div className="text-[clamp(1rem,1.55vw,1.8rem)] font-semibold leading-none">
          v 1.1.0
        </div>
        <div className="mt-2 text-[clamp(0.9rem,1.35vw,1.55rem)] font-semibold leading-none">
          2026.6.1
        </div>
      </div>
    </section>
  );
}
