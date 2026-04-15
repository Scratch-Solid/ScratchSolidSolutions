"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getGalleryImages } from "../directusApi";

const UploadTest = dynamic(() => import("./UploadTest"), { ssr: false });

export default function GalleryClient() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getGalleryImages().then((data) => {
      setImages(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-16 px-4 bg-white/90 dark:bg-black/80">
      <h1 className="text-4xl font-extrabold text-center text-black dark:text-zinc-50 mb-6 tracking-tight">
        Real Results & Reviews
      </h1>
      <p className="text-center text-zinc-700 dark:text-zinc-300 mb-8 max-w-xl">
        See real photos from our completed jobs and read authentic reviews from our clients. All content is uploaded directly by our cleaners and clients.
      </p>
      <div className="w-full max-w-2xl mb-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Before & After Gallery</h2>
        {loading ? (
          <div className="text-center text-zinc-500">Loading...</div>
        ) : images.length > 0 ? (
          <div className="flex flex-wrap gap-4 justify-center items-center">
            {images.map((img, i) => (
              <div key={i} className="w-40 h-32 bg-zinc-100 rounded-lg flex flex-col items-center justify-center border border-zinc-300 overflow-hidden">
                <img src={img.url} alt={img.caption || `Gallery image ${i+1}`} className="object-cover w-full h-full" />
                {img.caption && <div className="text-xs text-zinc-600 mt-1 px-1 text-center">{img.caption}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-zinc-400">No images found.</div>
        )}
      </div>
      <UploadTest />
      <Link href="/" className="text-blue-600 hover:underline font-semibold">Back to Home</Link>
    </div>
  );
}
