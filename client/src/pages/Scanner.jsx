import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function DebugScanner() {
  const videoRef = useRef(null);

  useEffect(() => {
    console.log("===== SCANNER INITIATED =====");

    const reader = new BrowserMultiFormatReader();
    let isMounted = true;

    async function startScanner() {
      console.log("[Scanner] Starting scanner setup...");

      try {
        console.log("[Scanner] Checking camera devices...");
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        console.log("[Scanner] Video input devices:", devices);

        if (!devices || devices.length === 0) {
          console.error("[Scanner] ❌ No camera devices found!");
          return;
        }

        const deviceId = devices[0].deviceId;
        console.log(`[Scanner] Using camera device: ${deviceId}`);

        console.log("[Scanner] Starting decodeFromVideoDevice...");

        reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          async (result, err, controls) => {
            console.log("[Scanner] Callback triggered:", { result, err });

            if (!isMounted) {
              console.warn("[Scanner] Component unmounted. Ignoring frame.");
              return;
            }

            if (result) {
              const text = result.getText();
              console.log("📦 SCANNED VALUE =", text);

              console.log("[Scanner] Making API call with scanned value...");

              try {
                const response = await fetch("/api/scan", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ value: text }),
                });

                console.log("[Scanner] API response status:", response.status);

                const data = await response.json().catch(() => {
                  console.warn("[Scanner] Could not parse JSON response.");
                  return null;
                });

                console.log("[Scanner] API response JSON:", data);
              } catch (apiErr) {
                console.error("[Scanner] ❌ API call failed:", apiErr);
              }
            }

            if (err && !(err instanceof NotFoundException)) {
              console.warn("[Scanner] Decoder error:", err);
            }
          }
        );
      } catch (setupErr) {
        console.error("[Scanner] ❌ FAILED DURING SETUP:", setupErr);
      }
    }

    startScanner();

    return () => {
      console.log("===== CLEANUP: Stopping scanner =====");
      isMounted = false;
      reader.reset();
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Debug Barcode Scanner</h2>
      <video
        ref={videoRef}
        style={{
          width: "350px",
          background: "#000",
          border: "3px solid red",
        }}
      ></video>
    </div>
  );
}
