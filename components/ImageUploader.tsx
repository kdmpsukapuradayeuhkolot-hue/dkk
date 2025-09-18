
import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2 } from 'lucide-react';
import DbImage from './DbImage';
import { processImage, storeImageBlob } from '../utils/imageUtils';
import type { FileRecord } from '../types';

interface ImageUploaderProps {
  fileId: string | undefined | null;
  onFileIdChange: (newFileId: string | null) => void;
  kind: FileRecord['kind'];
  aspectRatioClass: string;
  placeholderType: 'avatar' | 'product';
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ fileId, onFileIdChange, kind, aspectRatioClass, placeholderType }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File must be an image.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) { // 3MB limit
      setError('File size cannot exceed 3MB.');
      return;
    }
    
    setError(null);
    setIsProcessing(true);
    try {
      const processedBlob = await processImage(file);
      const newFileId = await storeImageBlob(processedBlob, kind);
      onFileIdChange(newFileId);
    } catch (err) {
      console.error('Image processing failed:', err);
      setError('Failed to process image.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onFileIdChange(null);
  };
  
  const triggerCamera = () => {
    if (fileInputRef.current) {
        fileInputRef.current.setAttribute('capture', 'environment');
        fileInputRef.current.click();
    }
  };
  
  const triggerFileUpload = () => {
      if(fileInputRef.current) {
          fileInputRef.current.removeAttribute('capture');
          fileInputRef.current.click();
      }
  }

  return (
    <div className="space-y-2">
      <div className={`relative overflow-hidden rounded-xl bg-neutral-800 border border-neutral-700 ${aspectRatioClass}`}>
        <DbImage fileId={fileId} placeholderType={placeholderType} className="w-full h-full object-cover" alt={kind === 'AVATAR' ? 'Customer avatar' : 'Product image'} />
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <p className="text-white">Processing...</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <button type="button" onClick={triggerFileUpload} className="button-upload flex-grow h-10 rounded-lg border px-3 border-neutral-700 hover:bg-neutral-800 flex items-center justify-center gap-2">
          <Upload className="h-4 w-4" /> {fileId ? 'Ganti' : 'Unggah'}
        </button>
        <button type="button" onClick={triggerCamera} className="button-upload h-10 w-10 rounded-lg border px-3 border-neutral-700 hover:bg-neutral-800 flex items-center justify-center">
          <Camera className="h-4 w-4" />
        </button>
        {fileId && (
          <button type="button" onClick={handleRemove} className="button-upload h-10 w-10 rounded-lg border border-red-900/50 bg-red-900/20 text-red-400 hover:bg-red-900/40 flex items-center justify-center">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default ImageUploader;