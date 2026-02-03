'use client';

import React, { useCallback, useState, useRef } from 'react';
import JSZip from 'jszip';
import { parseNiftiFile } from '@/lib/nifti-viewer/parser';
import { parseDicomFiles } from '@/lib/nifti-viewer/dicomParser';
import { ImageVolume } from '@/lib/nifti-viewer/types';

interface FileUploaderProps {
  onFileLoad: (volume: ImageVolume) => void;
  label: string;
  disabled?: boolean;
}

function isDicomFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.dcm') || name.endsWith('.dicom');
}

function isNiftiFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.nii') || name.endsWith('.nii.gz');
}

function isZipFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.zip');
}

function isDicomEntry(name: string): boolean {
  const basename = name.split('/').pop() || '';
  if (basename.startsWith('.') || basename === 'DICOMDIR') return false;
  if (basename.toLowerCase().endsWith('.dcm') || basename.toLowerCase().endsWith('.dicom')) return true;
  // Include files without common non-DICOM extensions (DICOM files often have no extension)
  const nonDicomExts = ['.txt', '.xml', '.json', '.csv', '.html', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.zip'];
  return !nonDicomExts.some((ext) => basename.toLowerCase().endsWith(ext));
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
  const dicomInputRef = useRef<HTMLInputElement>(null);

  const handleNiftiFile = useCallback(
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

  const handleDicomFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      setIsLoading(true);

      try {
        const arrayBuffers = await Promise.all(
          files.map((f) => f.arrayBuffer())
        );
        const volume = await parseDicomFiles(arrayBuffers);
        setFileName(`${files.length} DICOM files`);
        onFileLoad(volume);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to parse DICOM files'
        );
        setFileName(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onFileLoad]
  );

  const handleZipFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);

      try {
        const zipData = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(zipData);

        const dicomEntries = Object.entries(zip.files).filter(
          ([name, entry]) => !entry.dir && isDicomEntry(name)
        );

        if (dicomEntries.length === 0) {
          setError('No DICOM files found in the zip archive');
          setIsLoading(false);
          return;
        }

        const arrayBuffers = await Promise.all(
          dicomEntries.map(([, entry]) => entry.async('arraybuffer'))
        );

        const volume = await parseDicomFiles(arrayBuffers);
        setFileName(`${dicomEntries.length} DICOM files (from zip)`);
        onFileLoad(volume);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to parse zip file'
        );
        setFileName(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onFileLoad]
  );

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      // Single zip file — extract and process DICOM contents
      if (files.length === 1 && isZipFile(files[0])) {
        handleZipFile(files[0]);
        return;
      }

      // Single NIfTI file
      if (files.length === 1 && isNiftiFile(files[0])) {
        handleNiftiFile(files[0]);
        return;
      }

      // DICOM files (single or multiple)
      const dicomFiles = files.filter(
        (f) => isDicomFile(f) || (!isNiftiFile(f) && files.length > 1)
      );
      if (dicomFiles.length > 0) {
        handleDicomFiles(dicomFiles);
        return;
      }

      // Single file that's not explicitly NIfTI — try NIfTI first, then DICOM
      if (files.length === 1) {
        try {
          await handleNiftiFile(files[0]);
        } catch {
          handleDicomFiles(files);
        }
        return;
      }

      setError('Unsupported file format');
    },
    [handleNiftiFile, handleDicomFiles, handleZipFile]
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
        handleFiles(files);
      }
    },
    [handleFiles, disabled]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleDicomFolderClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled || isLoading) return;
      dicomInputRef.current?.click();
    },
    [disabled, isLoading]
  );

  const handleDicomFolderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const dicomFiles = Array.from(files).filter(
          (f) => !f.name.startsWith('.') && f.name !== 'DICOMDIR'
        );
        if (dicomFiles.length > 0) {
          handleDicomFiles(dicomFiles);
        } else {
          setError('No DICOM files found in the selected folder');
        }
      }
    },
    [handleDicomFiles]
  );

  return (
    <div className="w-full">
      {/* Hidden folder input for DICOM */}
      <input
        ref={dicomInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is a non-standard attribute
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleDicomFolderInput}
        disabled={disabled || isLoading}
        className="hidden"
      />

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
          accept=".nii,.nii.gz,.dcm,.dicom,.zip"
          multiple
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
              Drop .nii, .nii.gz, .dcm, or .zip files here
            </p>
          </div>
        )}
      </label>

      {/* DICOM folder button */}
      {!isLoading && (
        <button
          onClick={handleDicomFolderClick}
          disabled={disabled}
          className={`
            mt-2 w-full text-xs py-1.5 rounded border transition-colors
            ${
              disabled
                ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                : 'border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 hover:bg-gray-800'
            }
          `}
        >
          Load DICOM folder
        </button>
      )}

      {error && (
        <p className="mt-2 text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
