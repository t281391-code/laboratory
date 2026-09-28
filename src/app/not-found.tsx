import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Хуудас олдсонгүй</h1>
      <p>Үндсэн ажлын орон зай руу буцна уу.</p>
      <Link href="/" className="button primary">
        Хяналтын самбар
      </Link>
    </div>
  );
}
