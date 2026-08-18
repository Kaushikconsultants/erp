"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import { Camera, CameraOff, AlertCircle, RefreshCw } from "lucide-react";
import { playSuccessSound } from "@/lib/soundUtils";

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  fps?: number;
  qrbox?: number;
  soundEnabled?: boolean;
}

export default function CameraScanner({
  onScan,
  fps = 10,
  qrbox = 240,
  soundEnabled = true
}: CameraScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraList, setCameraList] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const containerId = useId().replace(/:/g, "_") + "_qr_box";
  const scannerInstanceRef = useRef<any>(null);
  const lastScanTimestamp = useRef<number>(0);
  const isMounted = useRef<boolean>(true);

  useEffect(() => {
    isMounted.current = true;

    // Dynamically import html5-qrcode on client only
    import("html5-qrcode")
      .then(({ Html5Qrcode }) => {
        if (!isMounted.current) return;
        Html5Qrcode.getCameras()
          .then((devices) => {
            if (!isMounted.current || !devices || !devices.length) return;
            setCameraList(devices);
            const backCam = devices.find((d) =>
              d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment")
            );
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          })
          .catch((err) => {
            console.warn("Cameras enumeration warning:", err);
          });
      })
      .catch((err) => console.error("Html5Qrcode import failed:", err));

    return () => {
      isMounted.current = false;
      cleanupScanner();
    };
  }, []);

  const cleanupScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop();
        }
        await scannerInstanceRef.current.clear();
      } catch (e) {
        console.warn("Cleanup scanner warning:", e);
      }
      scannerInstanceRef.current = null;
    }
  };

  const startScanner = async (cameraIdToUse?: string) => {
    setErrorMsg(null);
    setStarting(true);

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      
      // Clean up previous instance safely
      await cleanupScanner();

      const html5QrCode = new Html5Qrcode(containerId, {
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

      scannerInstanceRef.current = html5QrCode;

      const targetCam = cameraIdToUse || selectedCameraId;
      const cameraConfig = targetCam ? { deviceId: { exact: targetCam } } : { facingMode: "environment" };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: fps,
          qrbox: { width: qrbox, height: Math.round(qrbox * 0.7) },
          aspectRatio: 1.333334
        },
        (decodedText) => {
          const now = Date.now();
          if (now - lastScanTimestamp.current > 1500) {
            lastScanTimestamp.current = now;
            if (soundEnabled) {
              playSuccessSound();
            }
            onScan(decodedText);
          }
        },
        () => {
          // Frame missed, ignore
        }
      );

      if (isMounted.current) {
        setIsScanning(true);
      }
    } catch (err: any) {
      console.error("Camera activation error:", err);
      if (isMounted.current) {
        setErrorMsg(
          err?.message ||
            "Unable to access camera. Please check camera permissions or use the 'Connect Mobile Phone' option."
        );
        setIsScanning(false);
      }
    } finally {
      if (isMounted.current) {
        setStarting(false);
      }
    }
  };

  const stopScanner = async () => {
    await cleanupScanner();
    if (isMounted.current) {
      setIsScanning(false);
    }
  };

  const handleCameraChange = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    if (isScanning) {
      await stopScanner();
      startScanner(newCamId);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: "460px", margin: "0 auto" }}>
      {/* Viewfinder Frame */}
      <div
        style={{
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#0f172a",
          minHeight: isScanning ? "260px" : "180px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }}
      >
        {/* Dedicated Mount Div for Html5Qrcode - Children never modified by React when scanning */}
        <div id={containerId} style={{ width: "100%", display: isScanning ? "block" : "none" }} />

        {/* Placeholder UI when camera is stopped */}
        {!isScanning && (
          <div style={{ textAlign: "center", padding: "24px 16px", color: "#94a3b8" }}>
            <Camera size={40} style={{ margin: "0 auto 12px", opacity: 0.8, color: "#818cf8" }} />
            <p style={{ margin: "0 0 14px 0", fontSize: "0.9rem", color: "#e2e8f0" }}>
              {starting ? "Starting camera stream..." : "Camera is ready"}
            </p>
            <button
              type="button"
              className="primary-btn hover-lift"
              onClick={() => startScanner()}
              disabled={starting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                borderRadius: "8px",
                fontSize: "0.85rem"
              }}
            >
              <Camera size={16} /> {starting ? "Starting..." : "Start Camera Stream"}
            </button>
          </div>
        )}
      </div>

      {/* Error Message with Mobile Scanner Tip */}
      {errorMsg && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            borderRadius: "8px",
            background: "#fee2e2",
            color: "#991b1b",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px"
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong>Camera Notice:</strong> {errorMsg}
          </div>
        </div>
      )}

      {/* Camera Controls Toolbar */}
      {isScanning && (
        <div
          style={{
            marginTop: "10px",
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
                maxWidth: "200px"
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
