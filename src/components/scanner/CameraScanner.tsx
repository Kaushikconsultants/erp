"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, CameraOff, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { playSuccessSound, playErrorSound } from "@/lib/soundUtils";

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  fps?: number;
  qrbox?: number;
  soundEnabled?: boolean;
}

export default function CameraScanner({
  onScan,
  fps = 10,
  qrbox = 250,
  soundEnabled = true
}: CameraScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraList, setCameraList] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = useRef(`html5-qr-reader-${Math.random().toString(36).substring(2, 9)}`);
  const lastScanTimestamp = useRef<number>(0);

  useEffect(() => {
    // Get available video input devices
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length) {
          setCameraList(devices);
          // Prefer back/environment camera if available
          const backCam = devices.find(d => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch(err => {
        console.warn("Could not list cameras:", err);
      });

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async (cameraIdToUse?: string) => {
    setErrorMsg(null);
    const targetCam = cameraIdToUse || selectedCameraId;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerId.current, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
          ],
          verbose: false
        });
      }

      const cameraConfig = targetCam ? { deviceId: { exact: targetCam } } : { facingMode: "environment" };

      await scannerRef.current.start(
        cameraConfig,
        {
          fps: fps,
          qrbox: { width: qrbox, height: Math.round(qrbox * 0.7) },
          aspectRatio: 1.333334
        },
        (decodedText) => {
          const now = Date.now();
          // 1.5s debounce to avoid repeating same code within 1.5 seconds
          if (now - lastScanTimestamp.current > 1500 || decodedText !== lastScanned) {
            lastScanTimestamp.current = now;
            setLastScanned(decodedText);
            if (soundEnabled) {
              playSuccessSound();
            }
            onScan(decodedText);
          }
        },
        (errorMessage) => {
          // Ignore frequent scan misses
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera start failed:", err);
      setErrorMsg(err?.message || "Failed to access camera. Please allow camera permissions in browser.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.warn("Error stopping scanner:", e);
      }
    }
    setIsScanning(false);
  };

  const handleCameraChange = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    if (isScanning) {
      await stopScanner();
      startScanner(newCamId);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: "480px", margin: "0 auto", position: "relative" }}>
      {/* Scanner container */}
      <div
        id={readerId.current}
        style={{
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#0f172a",
          minHeight: isScanning ? "280px" : "180px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }}
      >
        {!isScanning && (
          <div style={{ textAlign: "center", padding: "24px 16px", color: "#94a3b8" }}>
            <Camera size={44} style={{ margin: "0 auto 12px", opacity: 0.7, color: "#818cf8" }} />
            <p style={{ margin: "0 0 16px 0", fontSize: "0.9rem", color: "#e2e8f0" }}>
              Camera Scanner is currently paused.
            </p>
            <button
              type="button"
              className="primary-btn hover-lift"
              onClick={() => startScanner()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "8px",
                fontSize: "0.9rem"
              }}
            >
              <Camera size={18} /> Turn On Camera
            </button>
          </div>
        )}
      </div>

      {/* Error message if any */}
      {errorMsg && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px 14px",
            borderRadius: "8px",
            background: "#fee2e2",
            color: "#991b1b",
            fontSize: "0.85rem"
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Camera Controls Toolbar */}
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
          {cameraList.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => handleCameraChange(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                background: "#fff",
                maxWidth: "220px"
              }}
            >
              {cameraList.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${cam.id.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={stopScanner}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #ef4444",
              background: "#fff",
              color: "#ef4444",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              marginLeft: "auto"
            }}
          >
            <CameraOff size={15} /> Pause Camera
          </button>
        </div>
      )}
    </div>
  );
}
