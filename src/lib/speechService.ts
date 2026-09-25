"use client";

import { Capacitor } from "@capacitor/core";

/**
 * Checks if running inside native Android App or Android WebView
 */
export const isNativeAppOrWebView = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {}
  return Boolean(
    (window as any).AndroidNative?.isNativeApp?.() ||
    /AntigravityERP|wv|WebView/i.test(navigator?.userAgent || "")
  );
};

/**
 * Checks if running on mobile device or native app wrapper
 */
export const isMobileOrNativeDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {}
  if ((window as any).AndroidNative?.isNativeApp?.()) return true;
  if (/Android|iPhone|iPad|iPod|Mobile|wv|WebView/i.test(navigator?.userAgent || "")) return true;
  if (navigator?.maxTouchPoints && navigator.maxTouchPoints > 1 && /Macintosh|Linux/i.test(navigator?.userAgent || "")) return true;
  return false;
};

let isMicPermissionCached = false;

/**
 * Request microphone permission cross-browser and native Android WebView
 */
export async function requestMicrophonePermission(): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined") {
    return { success: false, error: "Window is not defined" };
  }

  if (isMicPermissionCached) {
    return { success: true };
  }

  const native = (window as any).AndroidNative;

  // 1. Fast check if native Android bridge already reports permission granted
  if (native) {
    if (typeof native.hasMicrophonePermission === "function" && native.hasMicrophonePermission()) {
      isMicPermissionCached = true;
      return { success: true };
    }
  }

  // 2. Query standard Permissions API if supported (instant check, no stream overhead)
  if (navigator?.permissions && typeof navigator.permissions.query === "function") {
    try {
      const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (status.state === "granted") {
        isMicPermissionCached = true;
        return { success: true };
      }
    } catch {}
  }

  // 3. Fast direct check with getUserMedia (resolves in <20ms if already allowed by user)
  if (navigator?.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop tracks immediately so recording indicator turns off until recognition starts
      stream.getTracks().forEach(track => track.stop());
      return { success: true };
    } catch (err: any) {
      console.warn("getUserMedia permission check note:", err?.message || err);
      const isDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.message?.toLowerCase().includes("denied") ||
        err?.message?.toLowerCase().includes("permission");

      // If denied and native bridge is available, wait briefly (up to 2.5s) for user interaction
      if (isDenied && native && typeof native.requestMicrophonePermission === "function") {
        try {
          native.requestMicrophonePermission();
          const granted = await new Promise<boolean>((resolve) => {
            let cleanedUp = false;
            let timeoutId: any = null;
            const cleanup = () => {
              if (cleanedUp) return;
              cleanedUp = true;
              window.removeEventListener("native-microphone-permission-granted", onGranted);
              if (timeoutId) clearTimeout(timeoutId);
            };
            const onGranted = () => {
              cleanup();
              resolve(true);
            };
            window.addEventListener("native-microphone-permission-granted", onGranted);
            timeoutId = setTimeout(() => {
              cleanup();
              resolve(false);
            }, 2500);
          });

          if (granted) return { success: true };
        } catch {}
      }

      return {
        success: false,
        error: err?.message || "Microphone permission denied"
      };
    }
  }

  // 4. Fallback for older browsers
  return { success: true };
}

export interface SpeechRecognitionOptions {
  language?: "auto" | "bilingual" | "en-IN" | "hi-IN";
  continuous?: boolean;
  interimResults?: boolean;
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMsg: string, errorCode: string) => void;
  onEnd?: () => void;
}

/**
 * Checks if a speech transcript is an unfinished fragment (e.g. "take me to", "open", "show me")
 * to prevent cut-offs before the user speaks the target noun/action.
 * Note: Verbs in Hindi (dikhao, banao, kholo, batao) occur at the end of the sentence
 * and signify a COMPLETED command, so they MUST NOT be classified as incomplete.
 */
export function isIncompleteCommand(text: string): boolean {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  const words = t.split(/\s+/);
  if (words.length <= 1) {
    const singleWordIncomplete = [
      // English dangling particles / verbs without nouns
      "take", "open", "show", "go", "create", "add", "make", "what", "how", "who",
      "where", "why", "tell", "is", "the", "a", "an", "to", "my", "find",
      // Hinglish dangling particles
      "mujhe", "le", "chalo", "mere", "mera", "meri", "kya", "kahan", "kyun", "kaun",
      // Hindi Devanagari particles
      "ले", "मेरा", "मेरी", "मेरे", "मुझे", "क्या", "कैसे", "कहाँ", "क्यों", "कौन",
      "का", "की", "के", "में", "पर", "से", "को"
    ];
    return singleWordIncomplete.includes(t);
  }
  const incompleteEndings = [
    // English dangling phrases
    "take me to", "take me", "go to", "open the", "open a", "open an",
    "create a", "create an", "create new", "add a", "add an", "add new",
    "tell me", "tell me about", "what is the", "what are the",
    "how to", "how do i", "how can i", "how much is", "how many",
    "navigate to", "search for", "look for", "find a", "find the",
    "and", "with", "for", "about", "to the", "in the",
    // Hinglish dangling postpositions / particles
    "ke baare mein", "ke bare me", "ke baare me", "ki jaankari", "ki details",
    "ke liye", "aur", "ya", "pe jao", "par jao",
    // Hindi Devanagari dangling postpositions
    "के बारे में", "की जानकारी", "का विवरण", "के लिए", "और", "या", "पे जाओ", "पर जाओ"
  ];
  return incompleteEndings.some(ending => t === ending || t.endsWith(" " + ending));
}

let activeRecognition: any = null;
let activeMediaRecorder: MediaRecorder | null = null;
let activeAudioStream: MediaStream | null = null;
let activeAudioChunks: Blob[] = [];
let activeAudioContext: any = null;
let activeScriptProcessor: any = null;
let activePcmChunks: Float32Array[] = [];
let activePcmTotalLength = 0;
let activeVadAnimationId: number | null = null;
let isCurrentlyListening = false;
let intendedListening = false;
let activeMode: "web-speech" | "media-recorder" | null = null;
let noSpeechRetryCount = 0;
let restartTimeoutId: any = null;

/**
 * Downsamples Float32Array PCM samples from sourceRate to targetRate (e.g. 48000 -> 16000)
 */
function downsamplePCM(buffer: Float32Array, sourceRate: number, targetRate: number = 16000): Float32Array {
  if (sourceRate === targetRate || !sourceRate || !targetRate) return buffer;
  const ratio = sourceRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : buffer[offsetBuffer];
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Encodes Float32Array PCM audio into a standard 16-bit Mono 16kHz WAV Blob
 */
function encodeWavBlob(samples: Float32Array, sampleRate: number = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");

  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // 1 Channel Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample

  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Peak amplitude calculation for soft mobile microphones
  let maxAmp = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > maxAmp) maxAmp = a;
  }
  const gain = maxAmp > 0.02 && maxAmp < 0.75 ? Math.min(3.5, 0.85 / maxAmp) : 1.0;

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i] * gain));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

/**
 * Check if the browser or WebView supports Web Speech API OR MediaRecorder audio capture
 */
export const isSpeechRecognitionSupported = (): boolean => {
  if (typeof window === "undefined") return false;
  const hasWebSpeech = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const hasMediaRecorder = Boolean(
    typeof window !== "undefined" &&
    (window as any).MediaRecorder &&
    navigator?.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
  return hasWebSpeech || hasMediaRecorder;
};

/**
 * Check if Web Speech Synthesis (Text-to-Speech) is supported
 */
export const isSpeechSynthesisSupported = (): boolean => {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
};

/**
 * Safely stops any ongoing speech recognition session without throwing errors
 */
export const stopSpeechRecognition = () => {
  intendedListening = false;
  noSpeechRetryCount = 0;
  if (restartTimeoutId) {
    clearTimeout(restartTimeoutId);
    restartTimeoutId = null;
  }
  if (activeVadAnimationId) {
    cancelAnimationFrame(activeVadAnimationId);
    activeVadAnimationId = null;
  }
  if (activeScriptProcessor) {
    try {
      activeScriptProcessor.disconnect();
    } catch {}
    activeScriptProcessor = null;
  }
  // If MediaRecorder is active, request buffered audio and stop
  if (activeMediaRecorder && activeMediaRecorder.state !== "inactive") {
    try {
      if (typeof activeMediaRecorder.requestData === "function") {
        activeMediaRecorder.requestData();
      }
      activeMediaRecorder.stop();
    } catch (e) {}
  }
  if (activeRecognition) {
    try {
      activeRecognition.onresult = null;
      activeRecognition.onerror = null;
      activeRecognition.onend = null;
      activeRecognition.stop();
    } catch (e) {
      try {
        activeRecognition.abort();
      } catch {}
    }
    activeRecognition = null;
  }
  if (activeAudioStream && (!activeMediaRecorder || activeMediaRecorder.state === "inactive")) {
    try {
      activeAudioStream.getTracks().forEach(t => t.stop());
    } catch {}
    activeAudioStream = null;
  }
  isCurrentlyListening = false;
};

/**
 * Immediately aborts any ongoing speech recognition session without processing audio
 */
export const abortSpeechRecognition = () => {
  intendedListening = false;
  noSpeechRetryCount = 0;
  if (restartTimeoutId) {
    clearTimeout(restartTimeoutId);
    restartTimeoutId = null;
  }
  if (activeVadAnimationId) {
    cancelAnimationFrame(activeVadAnimationId);
    activeVadAnimationId = null;
  }
  if (activeScriptProcessor) {
    try {
      activeScriptProcessor.disconnect();
    } catch {}
    activeScriptProcessor = null;
  }
  if (activeAudioContext) {
    try {
      activeAudioContext.close();
    } catch {}
    activeAudioContext = null;
  }
  if (activeMediaRecorder && activeMediaRecorder.state !== "inactive") {
    try {
      activeMediaRecorder.ondataavailable = null;
      activeMediaRecorder.onstop = null;
      activeMediaRecorder.stop();
    } catch (e) {}
    activeMediaRecorder = null;
    activeAudioChunks = [];
  }
  activePcmChunks = [];
  activePcmTotalLength = 0;
  if (activeAudioStream) {
    try {
      activeAudioStream.getTracks().forEach(t => t.stop());
    } catch {}
    activeAudioStream = null;
  }
  if (activeRecognition) {
    try {
      activeRecognition.onresult = null;
      activeRecognition.onerror = null;
      activeRecognition.onend = null;
      activeRecognition.abort();
    } catch {}
    activeRecognition = null;
  }
  isCurrentlyListening = false;
  activeMode = null;
};

/**
 * MediaRecorder fallback for Android WebView / Capacitor / Mobile browsers without Web Speech API
 */
const startMediaRecorderRecognition = async (
  options: SpeechRecognitionOptions
): Promise<{ success: boolean; error?: string }> => {
  if (
    typeof window === "undefined" ||
    !navigator?.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    const errorMsg = "Microphone audio recording is not supported on this browser/device.";
    options.onError?.(errorMsg, "not-supported");
    return { success: false, error: errorMsg };
  }

  // 1. Grant app lock exemption while speaking
  try {
    (window as any).grantAppLockExemption?.(180);
  } catch {}

  // Request microphone stream directly in 1 step without redundant checks
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    isMicPermissionCached = true;

    activeAudioStream = stream;
    activeAudioChunks = [];
    activePcmChunks = [];
    activePcmTotalLength = 0;
    intendedListening = true;
    isCurrentlyListening = true;
    activeMode = "media-recorder";

    let mimeType = "audio/webm";
    if (typeof MediaRecorder !== "undefined") {
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/aac")) {
        mimeType = "audio/aac";
      }
    }

    let recorder: MediaRecorder | null = null;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      activeMediaRecorder = recorder;
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          activeAudioChunks.push(event.data);
        }
      };
    } catch (recErr) {
      console.warn("MediaRecorder instantiation notice:", recErr);
    }

    const recordingStartTime = Date.now();
    let speechDetected = false;
    let silenceStart = 0;
    let heartbeatInterval: any = null;
    let sourceSampleRate = 16000;

    // Web Audio API: captures raw PCM Float32 samples and calculates real acoustic energy
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }
        activeAudioContext = audioCtx;
        sourceSampleRate = audioCtx.sampleRate || 48000;
        const source = audioCtx.createMediaStreamSource(stream);

        // ScriptProcessor captures raw 32-bit float samples directly
        const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
        activeScriptProcessor = scriptProcessor;

        scriptProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
          if (!isCurrentlyListening || activeMode !== "media-recorder") return;
          const input = e.inputBuffer.getChannelData(0);
          const copy = new Float32Array(input.length);
          copy.set(input);
          activePcmChunks.push(copy);
          activePcmTotalLength += copy.length;

          // Calculate real RMS acoustic energy
          let sum = 0;
          for (let i = 0; i < copy.length; i++) {
            sum += copy[i] * copy[i];
          }
          const rms = Math.sqrt(sum / copy.length);

          // Sensitive acoustic energy detection tailored for mobile microphone AGC levels
          if (rms > 0.003) {
            if (!speechDetected) {
              speechDetected = true;
              options.onResult?.(
                options.language === "hi-IN"
                  ? "🎙️ सुन रहे हैं... बोलिए (Recording voice...)"
                  : "🎙️ Voice detected... (Speak now)",
                false
              );
            }
            silenceStart = 0;
          } else if (speechDetected && silenceStart === 0) {
            silenceStart = Date.now();
          }
        };

        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;
        source.connect(scriptProcessor);
        scriptProcessor.connect(silentGain);
        silentGain.connect(audioCtx.destination);
      }
    } catch (vadErr) {
      console.warn("Web Audio capture notice:", vadErr);
    }

    const handleFinalProcessing = async () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (activeScriptProcessor) {
        try {
          activeScriptProcessor.disconnect();
        } catch {}
        activeScriptProcessor = null;
      }
      if (activeAudioContext) {
        try {
          activeAudioContext.close();
        } catch {}
        activeAudioContext = null;
      }
      if (activeAudioStream) {
        try {
          activeAudioStream.getTracks().forEach(t => t.stop());
        } catch {}
        activeAudioStream = null;
      }

      const pcmChunks = [...activePcmChunks];
      const pcmTotal = activePcmTotalLength;
      activePcmChunks = [];
      activePcmTotalLength = 0;

      const mediaChunks = [...activeAudioChunks];
      activeAudioChunks = [];
      activeMediaRecorder = null;
      activeMode = null;

      if (!intendedListening && pcmTotal === 0 && mediaChunks.length === 0) {
        isCurrentlyListening = false;
        options.onEnd?.();
        return;
      }

      // Convert captured PCM Float32 audio into standard 16-bit Mono 16kHz WAV
      let audioBlob: Blob | null = null;
      let ext = "wav";

      if (pcmTotal > 0) {
        const merged = new Float32Array(pcmTotal);
        let currentOffset = 0;
        for (const chunk of pcmChunks) {
          merged.set(chunk, currentOffset);
          currentOffset += chunk.length;
        }
        const downsampled = downsamplePCM(merged, sourceSampleRate, 16000);
        audioBlob = encodeWavBlob(downsampled, 16000);
        ext = "wav";
      } else if (mediaChunks.length > 0) {
        audioBlob = new Blob(mediaChunks, { type: mimeType });
        ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("wav") ? "wav" : "webm";
      }

      if (!audioBlob || audioBlob.size < 40) {
        isCurrentlyListening = false;
        options.onError?.(
          options.language === "hi-IN"
            ? "कोई आवाज़ नहीं सुनाई दी। माइक दबाकर दोबारा बोलें।"
            : "No speech detected. Tap mic to speak again.",
          "no-speech"
        );
        options.onEnd?.();
        return;
      }

      // Transcribe via server API
      try {
        options.onResult?.(
          options.language === "hi-IN"
            ? "✨ AI द्वारा आवाज़ पहचानी जा रही है..."
            : "✨ Processing voice with AI...",
          false
        );

        const formData = new FormData();
        formData.append("audio", audioBlob, `voice_recording.${ext}`);
        formData.append("language", options.language || "auto");

        const baseUrl = typeof window !== "undefined" && window.location?.origin && window.location.origin.startsWith("http")
          ? window.location.origin
          : "https://erp.esponsports.com";
        const transcribeUrl = `${baseUrl}/api/voice/transcribe`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        let res: Response;
        try {
          res = await fetch(transcribeUrl, {
            method: "POST",
            credentials: "include",
            signal: controller.signal,
            body: formData
          });
        } finally {
          clearTimeout(timeoutId);
        }

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.transcript && data.transcript.trim()) {
          options.onResult?.(data.transcript.trim(), true);
        } else {
          options.onError?.(
            data.error ||
              (options.language === "hi-IN"
                ? "आवाज़ स्पष्ट नहीं सुनाई दी। कृपया दोबारा बोलें।"
                : "Could not clearly understand voice. Tap mic to retry."),
            data.error ? "transcription-failed" : "no-speech"
          );
        }
      } catch (err: any) {
        console.error("Transcription error:", err);
        const isTimeout = err?.name === "AbortError" || String(err?.message || "").includes("aborted");
        options.onError?.(
          isTimeout
            ? (options.language === "hi-IN"
                ? "आवाज़ पहचानने में समय समाप्त हो गया। कृपया दोबारा बोलें।"
                : "Voice processing timed out. Tap mic to speak again.")
            : (err?.message || "Could not transcribe voice. Tap mic to retry."),
          isTimeout ? "timeout" : "transcription-error"
        );
      } finally {
        isCurrentlyListening = false;
        options.onEnd?.();
      }
    };

    if (recorder) {
      recorder.onstop = handleFinalProcessing;
      recorder.start(100);
    }

    // Immediately notify UI that mic recording is live and ready (<30ms from tap!)
    options.onStart?.();
    options.onResult?.(
      options.language === "hi-IN"
        ? "🎙️ सुन रहे हैं... बोलिए (Speak now)"
        : "🎙️ Listening... (Speak your command now)",
      false
    );

    // Heartbeat for auto-stop, live feedback, and UI updates
    heartbeatInterval = setInterval(() => {
      if (!isCurrentlyListening || activeMode !== "media-recorder") {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        return;
      }

      const elapsed = Date.now() - recordingStartTime;

      // Provide live visual indicator that recording is active immediately
      if (elapsed > 100 && !speechDetected) {
        options.onResult?.(
          options.language === "hi-IN"
            ? "🎙️ सुन रहे हैं... बोलिए (Speak now)"
            : "🎙️ Listening... (Speak your command now)",
          false
        );
      }

      // If user paused speaking for 900ms after speech was detected, auto-stop and transcribe immediately!
      if (speechDetected && silenceStart > 0 && Date.now() - silenceStart > 900 && elapsed > 1200) {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        stopSpeechRecognition();
        if (!recorder) handleFinalProcessing();
        return;
      }

      // Hard limit: auto-stop at 5.0 seconds so commands are processed swiftly
      if (elapsed >= 5000) {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        stopSpeechRecognition();
        if (!recorder) handleFinalProcessing();
        return;
      }
    }, 150);

    return { success: true };
  } catch (err: any) {
    isCurrentlyListening = false;
    intendedListening = false;
    activeMode = null;
    const isPermissionError =
      err?.name === "NotAllowedError" ||
      err?.name === "PermissionDeniedError" ||
      err?.message?.toLowerCase().includes("permission");
    const errorMsg = isPermissionError
      ? "Microphone access denied. Please enable microphone permissions in your app or device settings."
      : err?.message || "Failed to start microphone recording. Tap mic to retry.";
    options.onError?.(errorMsg, isPermissionError ? "not-allowed" : "startup-error");
    return { success: false, error: errorMsg };
  }
};

/**
 * Starts a robust, collision-free speech recognition session (Web Speech API or MediaRecorder fallback)
 */
export const startSpeechRecognition = async (
  options: SpeechRecognitionOptions
): Promise<{ success: boolean; error?: string }> => {
  // 1. Stop any currently active session first to prevent 'already started' DOMExceptions
  stopSpeechRecognition();

  if (typeof window === "undefined") {
    return { success: false, error: "Window object not available." };
  }

  // 2. Grant app lock exemption while speaking so lock screen does not interrupt user
  try {
    (window as any).grantAppLockExemption?.(180);
  } catch {}

  // 3. Prefer native Web Speech API if available on browser/device (fastest real-time streaming, zero upload latency)
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition || (isNativeAppOrWebView() && !(window as any).webkitSpeechRecognition)) {
    console.info("Web Speech API not available on this platform; using direct MediaRecorder AI voice capture.");
    return startMediaRecorderRecognition(options);
  }

  intendedListening = true;
  noSpeechRetryCount = 0;
  activeMode = "web-speech";

  try {
    const recognition = new SpeechRecognition();
    activeRecognition = recognition;

    // Language configuration
    const lang = options.language === "hi-IN" ? "hi-IN" : "en-IN";
    recognition.lang = lang;
    recognition.continuous = options.continuous ?? false;
    recognition.interimResults = options.interimResults ?? true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isCurrentlyListening = true;
      options.onStart?.();
    };

    recognition.onresult = (event: any) => {
      if (!isCurrentlyListening && !intendedListening) return;

      // Active speech received - reset silence counter
      noSpeechRetryCount = 0;

      let fullTranscript = "";
      let isFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item[0]) {
          fullTranscript += item[0].transcript;
          if (item.isFinal) {
            isFinal = true;
          }
        }
      }

      const trimmed = fullTranscript.trim();
      if (trimmed) {
        if (isFinal) {
          intendedListening = false;
        }
        options.onResult?.(trimmed, isFinal);
      }
    };

    recognition.onerror = (event: any) => {
      const errorCode = event.error || "unknown";

      // Ignore intentional aborts
      if (errorCode === "aborted") {
        intendedListening = false;
        isCurrentlyListening = false;
        return;
      }

      // If Web Speech API fails due to service-not-allowed, network, audio-capture, or not-allowed, fall back to MediaRecorder!
      const hasMediaFallback = Boolean(
        navigator?.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
      );
      if (
        hasMediaFallback &&
        (errorCode === "service-not-allowed" ||
          errorCode === "network" ||
          errorCode === "audio-capture" ||
          errorCode === "not-allowed" ||
          errorCode === "language-not-supported")
      ) {
        console.warn(`Web Speech API failed with ${errorCode}, falling back to MediaRecorder...`);
        stopSpeechRecognition();
        startMediaRecorderRecognition(options);
        return;
      }

      // If user paused or hesitated without speaking yet, silently retry up to 3 times
      if (errorCode === "no-speech") {
        if (intendedListening && noSpeechRetryCount < 3) {
          noSpeechRetryCount++;
          console.debug(`Speech pause detected (#${noSpeechRetryCount}), maintaining microphone session...`);
          return;
        }

        intendedListening = false;
        isCurrentlyListening = false;
        options.onError?.("No speech detected. Tap mic to speak, or type below.", "no-speech");
        return;
      }

      intendedListening = false;
      isCurrentlyListening = false;

      let userFriendlyMsg = "Voice recognition error occurred. Tap mic to try again.";
      if (errorCode === "not-allowed") {
        userFriendlyMsg =
          "Microphone access blocked. Please enable microphone permissions in your browser or device settings.";
      } else if (errorCode === "network") {
        userFriendlyMsg =
          "Network error during speech recognition. Please check your internet connection.";
      } else if (errorCode === "audio-capture") {
        userFriendlyMsg = "No microphone hardware detected or microphone is in use by another app.";
      }

      console.warn("Speech recognition error:", errorCode, event);
      options.onError?.(userFriendlyMsg, errorCode);
    };

    recognition.onend = () => {
      // If the browser unexpectedly closed recognition while the user still intends to speak, auto-restart
      if (intendedListening && activeRecognition) {
        if (restartTimeoutId) clearTimeout(restartTimeoutId);
        restartTimeoutId = setTimeout(() => {
          if (intendedListening && activeRecognition) {
            try {
              activeRecognition.start();
              isCurrentlyListening = true;
            } catch (reErr) {
              console.debug("Speech recognition restart catch:", reErr);
            }
          }
        }, 80);
        return;
      }

      isCurrentlyListening = false;
      activeRecognition = null;
      activeMode = null;
      options.onEnd?.();
    };

    recognition.start();
    return { success: true };
  } catch (err: any) {
    console.warn("Speech recognition startup failure, falling back to MediaRecorder:", err);
    return startMediaRecorderRecognition(options);
  }
};

/**
 * Options for speech synthesis
 */
export interface SpeakTextOptions {
  lang?: "auto" | "bilingual" | "en-IN" | "hi-IN";
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

/**
 * Text-to-Speech synthesizer with speech queue clearing, Android Native Bridge,
 * and automatic Indian Hindi / English voice selection.
 */
export const speakText = (
  text: string,
  options?: SpeakTextOptions
) => {
  if (!text || typeof window === "undefined") return;

  // 1. Intelligent Language & Script Detection
  // If text contains Devanagari script, it MUST be voiced in Hindi even if UI toggle is EN
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const hasHindiWords = /\b(karein|karo|kaise|badle|hai|hain|nahi|karna|kare|banaye|dikhaye|namaste|dhanyawad|shukriya|kitna|sunte|kripya|batao|bataiye|dikhao|kholo)\b/i.test(text);
  const isHindi = hasDevanagari || options?.lang === "hi-IN" || hasHindiWords;
  const targetLang = isHindi ? "hi-IN" : "en-IN";

  // Clean markdown asterisks, bold tags, and hash prefixes for clean speech
  const cleanSpeech = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s?/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/₹/g, isHindi ? "रुपये " : "Rupees ")
    .replace(/\+/g, isHindi ? "और " : "plus ")
    .trim();

  if (!cleanSpeech) return;

  // 2. Primary: Native Android TextToSpeech Bridge (100% reliable on Android APK)
  const native = (window as any).AndroidNative;
  if (native && typeof native.speak === "function") {
    try {
      options?.onStart?.();
      native.speak(cleanSpeech, targetLang);

      // Estimate completion or wait for native-tts-end event
      const approxDurationMs = Math.max(1200, Math.min(25000, cleanSpeech.length * 75));
      const endTimer = setTimeout(() => {
        window.removeEventListener("native-tts-end", onNativeEnd);
        options?.onEnd?.();
      }, approxDurationMs);

      const onNativeEnd = () => {
        clearTimeout(endTimer);
        window.removeEventListener("native-tts-end", onNativeEnd);
        options?.onEnd?.();
      };
      window.addEventListener("native-tts-end", onNativeEnd, { once: true });
      return;
    } catch (nativeErr) {
      console.warn("Native TTS error, falling back to Web Speech:", nativeErr);
    }
  }

  // 3. Fallback: Web Speech API (window.speechSynthesis)
  if (!isSpeechSynthesisSupported()) {
    options?.onError?.(new Error("Speech synthesis not supported"));
    return;
  }

  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = targetLang;
    utterance.rate = options?.rate ?? 1.02;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    utterance.onstart = () => {
      options?.onStart?.();
    };
    utterance.onend = () => {
      options?.onEnd?.();
    };
    utterance.onerror = (e) => {
      console.debug("SpeechSynthesis utterance error:", e);
      options?.onError?.(e);
      options?.onEnd?.();
    };

    // Pick best matching authentic Indian voice
    let voices = window.speechSynthesis.getVoices?.() || [];
    if (voices.length > 0) {
      let matchingVoice: SpeechSynthesisVoice | null = null;

      if (isHindi) {
        // Priority 1: Natural online Indian Hindi voices
        matchingVoice = voices.find(
          v =>
            (v.name.includes("Swara") || v.name.includes("Madhur") || v.name.includes("Hemant")) &&
            (v.lang.toLowerCase().includes("hi") || v.name.toLowerCase().includes("hindi"))
        ) || null;

        // Priority 2: Google or standard Hindi voices
        if (!matchingVoice) {
          matchingVoice = voices.find(
            v =>
              v.name.includes("Google हिन्दी") ||
              v.name.toLowerCase().includes("hindi") ||
              v.name.includes("हिन्दी") ||
              v.lang.toLowerCase().startsWith("hi") ||
              v.lang.toLowerCase().includes("hi-in") ||
              v.lang.toLowerCase().includes("hi_in")
          ) || null;
        }

        // Priority 3: Any voice matching hi
        if (!matchingVoice) {
          matchingVoice = voices.find(v => v.lang.toLowerCase().startsWith("hi")) || null;
        }
      } else {
        // Priority 1: Natural online Indian English voices
        matchingVoice = voices.find(
          v =>
            (v.name.includes("Neerja") || v.name.includes("Prabhat") || v.name.includes("Ravi") || v.name.includes("Heera")) &&
            (v.lang.toLowerCase().includes("en-in") || v.name.toLowerCase().includes("india"))
        ) || null;

        // Priority 2: Google English (India)
        if (!matchingVoice) {
          matchingVoice = voices.find(
            v =>
              v.name.toLowerCase().includes("india") ||
              v.name.toLowerCase().includes("en-in") ||
              v.lang.toLowerCase() === "en-in" ||
              v.lang.toLowerCase() === "en_in"
          ) || null;
        }
      }

      // Priority 3: Fallback to any Indian voice
      if (!matchingVoice) {
        matchingVoice = voices.find(
          v => v.lang.toLowerCase().includes("in") || v.name.toLowerCase().includes("india")
        ) || null;
      }

      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.debug("Speech synthesis error:", err);
    options?.onError?.(err);
    options?.onEnd?.();
  }
};

/**
 * Immediately stops any text-to-speech reading
 */
export const stopSpeaking = () => {
  if (typeof window !== "undefined") {
    try {
      (window as any).AndroidNative?.stopSpeaking?.();
    } catch {}
    if (isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }
};
