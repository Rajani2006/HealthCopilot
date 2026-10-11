import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * CameraCapture
 * Functional browser camera component using navigator.mediaDevices.getUserMedia
 * Props:
 *   onCapture: (file: File) => void
 * States: 'idle' | 'starting' | 'live' | 'error'
 */
export default function CameraCapture({ onCapture }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'starting' | 'live' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  // Stop all active tracks on stream
  const stopTracks = (activeStream) => {
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
    }
  };

  // Cleanup on unmount: ensure camera light turns off immediately
  useEffect(() => {
    return () => {
      stopTracks(stream);
    };
  }, [stream]);

  // Attach stream to video element once it is rendered
  useEffect(() => {
    if (status === 'live' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [status, stream]);

  const handleOpenCamera = async () => {
    setErrorMessage('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('error');
      setErrorMessage("This browser can't open the camera here. Use Upload Photo instead.");
      return;
    }

    setStatus('starting');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(mediaStream);
      setStatus('live');
    } catch (err) {
      console.warn('Camera access error:', err);
      setStatus('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage("Camera permission is blocked. Click the lock icon in the address bar, allow Camera, then try again.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage("No camera was found on this device. Use Upload Photo instead.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMessage("The camera is being used by another app. Close it and try again.");
      } else {
        setErrorMessage(err.message || "Unable to access camera. Use Upload Photo instead.");
      }
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || status !== 'live') return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `medicine_scan_${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });
          // Stop camera tracks so indicator light turns off
          stopTracks(stream);
          setStream(null);
          setStatus('idle');
          if (onCapture) {
            onCapture(file);
          }
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleCancel = () => {
    stopTracks(stream);
    setStream(null);
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Viewfinder Viewport */}
      <div className="cam-view">
        {status === 'idle' && (
          <div className="cam-empty">
            <Camera size={44} color="var(--color-cyan)" style={{ margin: '0 auto 12px' }} />
            <strong style={{ display: 'block', fontSize: '15px', color: 'var(--color-text)', marginBottom: '4px' }}>
              Position medicine package in good lighting
            </strong>
            <span style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
              Click Open Camera below to start live scanning
            </span>
          </div>
        )}

        {status === 'starting' && (
          <div className="cam-empty">
            <Loader2 size={40} color="var(--color-cyan)" className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <strong style={{ display: 'block', fontSize: '15px', color: 'var(--color-text)' }}>
              Starting Camera...
            </strong>
            <span style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
              Requesting hardware access
            </span>
          </div>
        )}

        {status === 'live' && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Live camera viewfinder"
            />
            {/* Guide overlay only shown over live video */}
            <div className="cam-guide" aria-hidden="true" />
          </>
        )}

        {status === 'error' && (
          <div className="cam-empty">
            <AlertTriangle size={40} color="var(--color-warning)" style={{ margin: '0 auto 12px' }} />
            <strong style={{ display: 'block', fontSize: '15px', color: 'var(--color-text)' }}>
              Camera Unavailable
            </strong>
            <div className="cam-err">{errorMessage}</div>
          </div>
        )}
      </div>

      {/* Guide Instruction - Placed cleanly OUTSIDE the guide frame */}
      {status === 'live' && (
        <p style={{
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          margin: '0 auto',
          maxWidth: '500px'
        }}>
          Position the medicine label inside the cyan box, ensure the brand name and strength are clear, then press Capture.
        </p>
      )}

      {/* Camera Action Controls */}
      <div className="cam-actions">
        {status === 'idle' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCamera}
            id="open-camera-btn"
          >
            <Camera size={16} />
            <span>Open Camera</span>
          </button>
        )}

        {status === 'starting' && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled
            id="camera-starting-btn"
          >
            <Loader2 size={16} className="animate-spin" />
            <span>Opening Camera...</span>
          </button>
        )}

        {status === 'live' && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCapture}
              id="capture-photo-btn"
            >
              <Camera size={16} />
              <span>Capture Photo</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              id="cancel-camera-btn"
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
          </>
        )}

        {status === 'error' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCamera}
            id="retry-camera-btn"
          >
            <RefreshCw size={16} />
            <span>Try Camera Again</span>
          </button>
        )}
      </div>
    </div>
  );
}
