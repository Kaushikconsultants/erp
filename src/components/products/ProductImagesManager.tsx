"use client";

import React, { useState, useRef } from 'react';
import { Upload, X, Star, Image as ImageIcon, Link as LinkIcon, Eye, Plus, Check } from 'lucide-react';

interface ProductImagesManagerProps {
  initialImages?: string[];
  onChange?: (images: string[]) => void;
  name?: string; // Form input name, defaults to 'images'
}

export default function ProductImagesManager({
  initialImages = [],
  onChange,
  name = 'images'
}: ProductImagesManagerProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateImages = (newImages: string[]) => {
    setImages(newImages);
    if (onChange) onChange(newImages);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const readPromises = fileArray.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then(newUrls => {
      const filtered = newUrls.filter(url => url && !images.includes(url));
      updateImages([...images, ...filtered]);
    });
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!images.includes(trimmed)) {
      updateImages([...images, trimmed]);
    }
    setUrlInput('');
    setShowUrlInput(false);
  };

  const handleRemove = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    updateImages(next);
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const selected = images[index];
    const rest = images.filter((_, i) => i !== index);
    updateImages([selected, ...rest]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Hidden input for standard HTML form submission */}
      <input type="hidden" name={name} value={JSON.stringify(images)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ImageIcon size={16} color="#4f46e5" /> Product Images ({images.length})
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          style={{
            background: 'none',
            border: 'none',
            color: '#4f46e5',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <LinkIcon size={13} /> {showUrlInput ? 'Hide URL input' : 'Add via Image URL'}
        </button>
      </div>

      {showUrlInput && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="url"
            placeholder="Paste image web link (https://...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem'
            }}
          />
          <button
            type="button"
            onClick={handleAddUrl}
            disabled={!urlInput.trim()}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: urlInput.trim() ? '#4f46e5' : '#94a3b8',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: urlInput.trim() ? 'pointer' : 'default'
            }}
          >
            Add Image
          </button>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#4f46e5' : '#cbd5e1'}`,
          backgroundColor: isDragging ? '#f5f3ff' : '#f8fafc',
          borderRadius: '10px',
          padding: '18px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
          <Upload size={20} />
        </div>
        <div>
          <span style={{ color: '#4f46e5', fontWeight: 600, fontSize: '0.875rem' }}>Click to upload multiple images</span>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}> or drag and drop</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Supports PNG, JPG, JPEG, WEBP (Max 5MB each)</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>

      {/* Thumbnail Previews Grid */}
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
          gap: '10px',
          marginTop: '6px'
        }}>
          {images.map((img, idx) => (
            <div
              key={idx}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: '8px',
                border: idx === 0 ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
            >
              <img
                src={img}
                alt={`Product image ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />

              {/* Cover Badge */}
              {idx === 0 && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  backgroundColor: '#4f46e5',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}>
                  <Star size={10} fill="#fff" /> Cover
                </div>
              )}

              {/* Top Right Actions */}
              <div style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                display: 'flex',
                gap: '3px'
              }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewModalImg(img);
                  }}
                  title="Preview"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(idx);
                  }}
                  title="Remove image"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={11} />
                </button>
              </div>

              {/* Bottom "Set Primary" Action for non-cover images */}
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(idx)}
                  title="Set as Cover Image"
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '4px',
                    right: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    color: '#4f46e5',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    padding: '2px 4px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px'
                  }}
                >
                  <Star size={9} /> Set Cover
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full Size Image Preview Lightbox */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '85vw', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewModalImg(null)}
              style={{
                position: 'absolute',
                top: '-16px',
                right: '-16px',
                backgroundColor: '#fff',
                color: '#0f172a',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              <X size={18} />
            </button>
            <img
              src={previewModalImg}
              alt="Full Preview"
              style={{
                maxWidth: '85vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
