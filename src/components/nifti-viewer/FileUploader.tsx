'use client';

import React, { useCallback, useState } from 'react';
import { parseNiftiFile, NiftiVolume } from '@/lib/nifti-viewer/parser';

interface FileUploaderProps {
  onFileLoad: (volume: NiftiVolume) => void;
  label: string;
  disabled?: boolean;
}

export default function FileUploader({
  onFileLoad,
  label,
  disabled = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const volume = await parseNiftiFile(arrayBuffer);
        setFileName(file.name);
        onFileLoad(volume);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to parse NIfTI file'
        );
        setFileName(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onFileLoad]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile, disabled]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  return (
    <div className="w-full">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center w-full p-4
          border-2 border-dashed rounded-lg cursor-pointer
          transition-colors duration-200
          ${
            disabled
              ? 'border-gray-600 bg-gray-900 cursor-not-allowed'
              : isDragging
                ? 'border-blue-400 bg-blue-900/50'
                : 'border-gray-600 hover:border-gray-500 bg-gray-900 hover:bg-gray-800'
          }
        `}
      >
        <input
          type="file"
          accept=".nii,.nii.gz"
          onChange={handleFileInput}
          disabled={disabled || isLoading}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-200">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </div>
        ) : fileName ? (
          <div className="text-center">
            <span className="text-green-300 text-sm font-medium">{fileName}</span>
            <p className="text-gray-300 text-xs mt-1">Click to replace</p>
          </div>
        ) : (
          <div className="text-center">
            <span className="text-gray-200">{label}</span>
            <p className="text-gray-300 text-xs mt-1">
              Drop .nii or .nii.gz file here
            </p>
          </div>
        )}
      </label>

      {error && (
        <p className="mt-2 text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
