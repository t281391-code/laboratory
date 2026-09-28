"use client";
import { useState } from "react";
import { Camera, Upload, X } from "lucide-react";
/* Local data URLs are intentionally rendered directly; no image server is used. */
/* eslint-disable @next/next/no-img-element */
export function PhotoUpload({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="photo-upload">
      <div className="photo-grid">
        {photos.map((photo, i) => (
          <div className="photo-item" key={i}>
            <img src={photo} alt={`Сорьцын хавсаргасан зураг ${i + 1}`} />
            <button
              type="button"
              aria-label={`${i + 1}-р зураг хасах`}
              onClick={() => onChange(photos.filter((_, index) => index !== i))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      {photos.length < 3 && (
        <label className="upload-target">
          <Camera size={24} />
          <strong>
            {loading ? "Зургийг уншиж байна..." : "Сорьцын зураг хавсаргах"}
          </strong>
          <span>JPG, PNG, WEBP · Зураг бүр 1 МБ хүртэл · 3 зураг</span>
          <span className="button secondary small">
            <Upload size={14} />
            Зураг сонгох
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={loading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError("");
              if (
                !["image/jpeg", "image/png", "image/webp"].includes(
                  file.type,
                ) ||
                file.size > 1024 * 1024
              ) {
                setError(
                  "JPG, PNG эсвэл WEBP төрлийн, 1 МБ-аас бага зураг сонгоно уу.",
                );
                e.target.value = "";
                return;
              }
              setLoading(true);
              try {
                const data = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                onChange([...photos, data]);
              } catch {
                setError("Зургийг уншиж чадсангүй. Дахин сонгоно уу.");
              } finally {
                setLoading(false);
                e.target.value = "";
              }
            }}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
