'use client';

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import styles from '../styles/upload.module.css';

interface FileUploadZoneProps {
  onUploadComplete: (data: Record<string, unknown>) => void;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const ACCEPTED_EXTENSIONS = '.pdf,.pptx';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string): string {
  if (type === 'application/pdf') return '\uD83D\uDCC4';
  return '\uD83D\uDCCA';
}

export default function FileUploadZone({ onUploadComplete }: FileUploadZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): boolean => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Only PDF and PPTX files are accepted.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleFile = (f: File) => {
    if (validateFile(f)) {
      setFile(f);
    }
  };

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleBrowseClick = () => {
    inputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Upload failed');
      }

      const data = await res.json();
      onUploadComplete(data);
      removeFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const dropZoneClasses = [
    styles.dropZone,
    isDragActive ? styles.dropZoneActive : '',
    isUploading ? styles.dropZoneDisabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <div
        className={dropZoneClasses}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!file && !isUploading ? handleBrowseClick : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleChange}
          className={styles.dropInput}
          style={{ display: 'none' }}
        />
        <div className={styles.dropIcon}>&#x1F4C1;</div>
        <div className={styles.dropTitle}>
          {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
        </div>
        <div className={styles.dropDesc}>
          or{' '}
          <span className={styles.dropBrowse} onClick={handleBrowseClick}>
            browse your files
          </span>
        </div>
        <div className={styles.dropFormats}>
          <span className={styles.formatTag}>PDF</span>
          <span className={styles.formatTag}>PPTX</span>
        </div>
      </div>

      {error && (
        <div className={`${styles.uploadStatus} ${styles.statusError}`}>
          <span className={styles.statusIcon}>&#x26A0;</span>
          <span className={styles.statusText}>{error}</span>
        </div>
      )}

      {file && (
        <div className={styles.filePreview}>
          <div className={styles.previewItem}>
            <div className={styles.previewIcon}>{getFileIcon(file.type)}</div>
            <div className={styles.previewInfo}>
              <div className={styles.previewName}>{file.name}</div>
              <div className={styles.previewSize}>{formatFileSize(file.size)}</div>
            </div>
            <button
              className={styles.previewRemove}
              onClick={removeFile}
              disabled={isUploading}
              aria-label="Remove file"
            >
              &#x2715;
            </button>
          </div>
        </div>
      )}

      {file && (
        <div className={styles.uploadActions}>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <span className="spinner spinner-sm" />
                Uploading...
              </>
            ) : (
              'Upload & Process'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
