"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RefreshCw, AlertCircle, Zap, ZapOff, SwitchCamera } from "lucide-react";
import { playSuccessSound } from "@/lib/soundUtils";

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  fps?: number;
  qrbox?: number;
  soundEnabled?: boolean;
}

export default function CameraScanner({
  onScan,
  fps = 15,
  soundEnabled = true
}: CameraScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanTimestamp = useRef<number>(0);
  const lastScannedText = useRef<string | null>(null);
  const isMounted = useRef<boolean>(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopStream();
    };
  }, []);

  const stopStream = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (isMounted.current) {
      setIsScanning(false);
      setTorchOn(false);
      setHasTorch(false);
    }
  };

  const handleDetectedCode = (code: string) => {
    if (!code || !code.trim()) return;
    const now = Date.now();
    // 1.5s debounce to avoid repeating
    if (now - lastScanTimestamp.current > 1500 || code !== lastScannedText.current) {
      lastScanTimestamp.current = now;
      lastScannedText.current = code;
      if (soundEnabled) {
        playSuccessSound();
      }
      onScan(code.trim());
    }
  };

  const startStream = async (targetFacing: "environment" | "user" = facingMode) => {
    setErrorMsg(null);
    setStarting(true);
    stopStream();

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser. Please use a modern mobile browser (Chrome/Safari).");
      }

      // Request standard environment or user camera without restrictive deviceId constraints
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch((e) => console.warn("Video play promise warning:", e));
      }

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track && typeof track.getCapabilities === "function") {
        const capabilities: any = track.getCapabilities();
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }

      if (isMounted.current) {
        setIsScanning(true);
        setFacingMode(targetFacing);
      }

      // Start Decoder Loop
      startScanningLoop();
    } catch (err: any) {
      console.error("Camera getUserMedia error:", err);
      if (isMounted.current) {
        setErrorMsg(
          err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
            ? "Camera permission was denied. Please allow camera permissions in your browser settings."
            : err?.message || "Could not open camera stream. Please ensure camera is not in use by another app."
        );
        setIsScanning(false);
      }
    } finally {
      if (isMounted.current) {
        setStarting(false);
      }
    }
  };

  const startScanningLoop = () => {
    // 1. Try Native BarcodeDetector (Supported natively on Android Chrome & modern Chromium)
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"]
        });

        const scanFrame = async () => {
          if (!isMounted.current || !videoRef.current || videoRef.current.readyState < 2) {
            animFrameIdRef.current = requestAnimationFrame(scanFrame);
            return;
          }

          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              if (rawValue) {
                handleDetectedCode(rawValue);
              }
            }
          } catch (e) {
            // Frame detection error, ignore
          }

          animFrameIdRef.current = requestAnimationFrame(scanFrame);
        };

        animFrameIdRef.current = requestAnimationFrame(scanFrame);
        return;
      } catch (e) {
        console.warn("Native BarcodeDetector initialization fallback:", e);
      }
    }

    // 2. Fallback using html5-qrcode / canvas scanner
    import("html5-qrcode")
      .then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
        if (!isMounted.current) return;

        const scanCanvasFallback = async () => {
          if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          try {
            const tempScanner = new Html5Qrcode("hidden-fallback-scanner-mount", {
              formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.UPC_A
              ],
              verbose: false
            });

            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
            if (blob) {
              const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
              const result = await tempScanner.scanFile(file, false);
              if (result) {
                handleDetectedCode(result);
              }
            }
            tempScanner.clear();
          } catch (err) {
            // Ignore scan miss
          }
        };

        fallbackIntervalRef.current = setInterval(scanCanvasFallback, 250);
      })
      .catch((err) => console.error("Fallback scanner failed to load:", err));
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextTorch = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextTorch } as any]
        });
        setTorchOn(nextTorch);
      } catch (e) {
        console.warn("Torch toggle error:", e);
      }
    }
  };

  const toggleCameraFacing = async () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    await startStream(nextFacing);
  };

  return (
    <div style={{ width: "100%", maxWidth: "480px", margin: "0 auto", position: "relative" }}>
      {/* Hidden elements for canvas fallback */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div id="hidden-fallback-scanner-mount" style={{ display: "none" }} />

      {/* Main Viewfinder Frame */}
      <div
        style={{
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          background: "#000000",
          minHeight: "260px",
          height: isScanning ? "300px" : "200px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          border: "2px solid rgba(255,255,255,0.15)"
        }}
      >
        {/* Live Video Element */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: isScanning ? "block" : "none"
          }}
        />

        {/* Viewfinder Reticle & Animated Laser (when scanning) */}
        {isScanning && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "240px",
              height: "160px",
              border: "2px solid rgba(99, 102, 241, 0.8)",
              borderRadius: "12px",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {/* Corner Indicators */}
            <div style={{ position: "absolute", top: "-2px", left: "-2px", width: "16px", height: "16px", borderTop: "4px solid #4ade80", borderLeft: "4px solid #4ade80", borderTopLeftRadius: "6px" }} />
            <div style={{ position: "absolute", top: "-2px", right: "-2px", width: "16px", height: "16px", borderTop: "4px solid #4ade80", borderRight: "4px solid #4ade80", borderTopRightRadius: "6px" }} />
            <div style={{ position: "absolute", bottom: "-2px", left: "-2px", width: "16px", height: "16px", borderBottom: "4px solid #4ade80", borderLeft: "4px solid #4ade80", borderBottomLeftRadius: "6px" }} />
            <div style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "16px", height: "16px", borderBottom: "4px solid #4ade80", borderRight: "4px solid #4ade80", borderBottomRightRadius: "6px" }} />

            {/* Pulsing Scanning Line */}
            <div
              style={{
                width: "90%",
                height: "2px",
                background: "linear-gradient(90deg, transparent, #4ade80, transparent)",
                boxShadow: "0 0 8px #4ade80",
                animation: "scanner-laser 2s infinite ease-in-out"
              }}
            />
          </div>
        )}

        {/* Start Button when Camera is Off */}
        {!isScanning && (
          <div style={{ textAlign: "center", padding: "24px 16px", color: "#94a3b8" }}>
            <Camera size={44} style={{ margin: "0 auto 12px", opacity: 0.8, color: "#818cf8" }} />
            <p style={{ margin: "0 0 14px 0", fontSize: "0.9rem", color: "#e2e8f0" }}>
              {starting ? "Starting live camera stream..." : "Camera is ready to scan"}
            </p>
            <button
              type="button"
              className="primary-btn hover-lift"
              onClick={() => startStream("environment")}
              disabled={starting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 22px",
                borderRadius: "10px",
                fontSize: "0.9rem",
                fontWeight: 700,
                background: "#4f46e5",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)"
              }}
            >
              <Camera size={18} /> {starting ? "Opening Camera..." : "Start Camera"}
            </button>
          </div>
        )}
      </div>

      {/* Error Message Notice */}
      {errorMsg && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px 14px",
            borderRadius: "10px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid #ef4444",
            color: "#fca5a5",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px"
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px", color: "#f87171" }} />
          <div>
            <strong>Camera Notice:</strong> {errorMsg}
          </div>
        </div>
      )}

      {/* Camera In-Use Controls */}
      {isScanning && (
        <div
          style={{
            marginTop: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            {/* Flip Camera Button */}
            <button
              type="button"
              onClick={toggleCameraFacing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #475569",
                background: "rgba(30, 41, 59, 0.8)",
                color: "#e2e8f0",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <SwitchCamera size={16} /> {facingMode === "environment" ? "Back Camera" : "Front Camera"}
            </button>

            {/* Flashlight/Torch Button if supported */}
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: torchOn ? "1px solid #eab308" : "1px solid #475569",
                  background: torchOn ? "rgba(234, 179, 8, 0.2)" : "rgba(30, 41, 59, 0.8)",
                  color: torchOn ? "#fde047" : "#e2e8f0",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {torchOn ? <ZapOff size={16} /> : <Zap size={16} />}
                {torchOn ? "Torch On" : "Torch Off"}
              </button>
            )}
          </div>

          {/* Stop / Pause Button */}
          <button
            type="button"
            onClick={stopStream}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #ef4444",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#fca5a5",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              marginLeft: "auto"
            }}
          >
            <CameraOff size={16} /> Stop Camera
          </button>
        </div>
      )}

      {/* Laser animation styling */}
      <style jsx>{`
        @keyframes scanner-laser {
          0% {
            transform: translateY(-50px);
            opacity: 0.2;
          }
          50% {
            transform: translateY(50px);
            opacity: 1;
          }
          100% {
            transform: translateY(-50px);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
