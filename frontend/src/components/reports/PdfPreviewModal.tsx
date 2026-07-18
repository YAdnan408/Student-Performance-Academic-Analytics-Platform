'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  fetchPdf: () => Promise<Blob>;
}

const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  filename,
  fetchPdf,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError('');

    fetchPdf()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to generate report. Please try again.';
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, fetchPdf]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    link.click();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col bg-slate-900/98 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              disabled={!pdfUrl || loading}
            >
              Download PDF
            </Button>
            <button
              onClick={onClose}
              className="text-purple-200/50 hover:text-white transition-colors p-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-slate-950/50">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Spinner size="lg" />
              <p className="text-purple-200/60 text-sm">Generating report…</p>
            </div>
          )}
          {!loading && error && (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {!loading && !error && pdfUrl && (
            <iframe
              src={pdfUrl}
              title={title}
              className="w-full h-full border-0 bg-white"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default PdfPreviewModal;
