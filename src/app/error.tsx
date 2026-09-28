"use client";
import { AlertTriangle, RotateCcw } from "lucide-react";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="empty-state">
      <AlertTriangle size={36} />
      <h1>Мэдээллийг харуулахад алдаа гарлаа</h1>
      <p>Хадгалсан мэдээлэл тань хөтөч дээр хэвээр байна.</p>
      <button className="button primary" onClick={reset}>
        <RotateCcw size={17} />
        Дахин оролдох
      </button>
    </div>
  );
}
