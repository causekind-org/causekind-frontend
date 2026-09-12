'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function CameraCaptureModal({ isOpen, onClose, onCapture }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  const startCamera = useCallback(async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Camera access denied or unavailable. Please use file upload instead.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `scanned_document_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            onClose();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md"
      >
        <div className="flex justify-between items-center p-4">
          <h2 className="text-white font-medium">Scan Document</h2>
          <button onClick={onClose} className="p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
          {error ? (
            <div className="text-center p-6 max-w-sm">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-white mb-6 text-sm">{error}</p>
              <button onClick={onClose} className="bg-brand-500 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:bg-brand-600 transition-colors w-full">
                Close
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                videoRef.current?.play().catch(e => console.error("Error playing video:", e));
              }}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Overlay guide */}
          {!error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="w-[90%] max-w-md aspect-[1.586/1] border-2 border-brand-500/50 rounded-2xl relative shadow-[0_0_0_4000px_rgba(0,0,0,0.5)]">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-brand-500 rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-brand-500 rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-brand-500 rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-brand-500 rounded-br-xl"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 flex justify-center items-center bg-black pb-12">
          {!error && (
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white/50 flex items-center justify-center active:scale-95 transition-transform group"
            >
              <div className="w-16 h-16 bg-white rounded-full group-hover:bg-brand-100 transition-colors"></div>
            </button>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </AnimatePresence>
  );
}
