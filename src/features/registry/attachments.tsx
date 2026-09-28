"use client";
/* Attachments are served by an authenticated API route, never from a public URL. */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Download, Eye, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { ConfirmDialog, Modal, useUI } from "@/components/ui";
import { formatBytes, type AttachmentDto } from "@/lib/registry";
import { formatTimestamp } from "@/lib/utils";
import { attachmentUrl, registryApi } from "./store";

export function AttachmentPreview({ attachment, onClose }: { attachment: AttachmentDto; onClose: () => void }) {
  return (
    <Modal title={attachment.name} onClose={onClose} wide className="reg-preview">
      {attachment.mimeType === "application/pdf" ? (
        <iframe className="reg-preview-frame" src={attachmentUrl(attachment.id)} title={attachment.name} />
      ) : (
        <img className="reg-preview-image" src={attachmentUrl(attachment.id)} alt={attachment.name} />
      )}
      <div className="dialog-actions">
        <a className="button secondary" href={attachmentUrl(attachment.id, true)}><Download size={16} />Татах</a>
        <button className="button primary" onClick={onClose}>Хаах</button>
      </div>
    </Modal>
  );
}

export function AttachmentList({ attachments, canRemove }: { attachments: AttachmentDto[]; canRemove: boolean }) {
  const [preview, setPreview] = useState<AttachmentDto | null>(null);
  const [removing, setRemoving] = useState<AttachmentDto | null>(null);
  if (!attachments.length) return <p className="reg-muted">Хавсаргасан файл байхгүй.</p>;
  return (
    <>
      <ul className="reg-files">
        {attachments.map((file) => (
          <li className="reg-file" key={file.id}>
            <span className="reg-file-icon">{file.mimeType === "application/pdf" ? <FileText size={18} /> : <ImageIcon size={18} />}</span>
            <span className="reg-file-name">
              <strong title={file.name}>{file.name}</strong>
              <small>{formatBytes(file.size)} · {file.uploadedByName} · {formatTimestamp(file.uploadedAt)}</small>
            </span>
            <span className="reg-file-actions">
              <button type="button" className="button secondary small" onClick={() => setPreview(file)}><Eye size={14} />Харах</button>
              <a className="button secondary small" href={attachmentUrl(file.id, true)}><Download size={14} />Татах</a>
              {canRemove && <button type="button" className="button secondary small reg-danger" onClick={() => setRemoving(file)}><Trash2 size={14} />Устгах</button>}
            </span>
          </li>
        ))}
      </ul>
      {preview && <AttachmentPreview attachment={preview} onClose={() => setPreview(null)} />}
      {removing && (
        <ConfirmDialog
          title="Хавсралт устгах"
          description={`«${removing.name}» файлыг хавсралтаас хасах уу? Үйлдэл өөрчлөлтийн түүхэнд бүртгэгдэнэ.`}
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            registryApi.removeAttachment(removing.id)
              .then(() => useUI.getState().notify("Хавсралт хасагдлаа"))
              .catch((error) => useUI.getState().notify(error instanceof Error ? error.message : "Хавсралтыг хасаж чадсангүй."));
          }}
        />
      )}
    </>
  );
}
