"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [intervalValue, setIntervalValue] = useState("500");
  const [instruction, setInstruction] = useState("What do you see?");
  const [response, setResponse] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:8080");
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize camera when component mounts
  useEffect(() => {
    initCamera();

    // Cleanup function to stop stream and clear interval when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  async function initCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Wait for the video to be loaded before allowing capture
        videoRef.current.onloadedmetadata = () => {
          console.log(
            "Video metadata loaded, video dimensions:",
            videoRef.current?.videoWidth,
            videoRef.current?.videoHeight
          );
        };
      }
      setResponse("Camera access granted. Ready to start.");
    } catch (err) {
      console.error("Error accessing camera:", err);
      setResponse(
        `Error accessing camera: Please ensure permissions are granted and you are on HTTPS or localhost.`
      );
      alert(
        `Error accessing camera. Make sure you've granted permission and are on HTTPS or localhost.`
      );
    }
  }

  function captureImage() {
    const video = videoRef.current;

    // More detailed logging to diagnose the issue
    console.log("Capture attempt:", {
      streamExists: !!stream,
      videoExists: !!video,
      videoWidth: video?.videoWidth,
      videoHeight: video?.videoHeight,
      videoReadyState: video?.readyState,
    });

    if (!stream || !video || !video.videoWidth || video.videoWidth === 0) {
      console.warn("Video stream not ready for capture.");
      return null;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn("Canvas reference not available");
      return null;
    }

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

        // Verify we got valid data
        if (dataUrl.length < 100) {
          console.error("Generated data URL is too short, likely invalid");
          return null;
        }

        return dataUrl;
      } else {
        console.error("Could not get canvas context");
        return null;
      }
    } catch (error) {
      console.error("Error during image capture:", error);
      return null;
    }
  }

  async function sendChatCompletionRequest(
    instruction: string,
    imageBase64URL: string
  ) {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: instruction },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64URL,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return `Server error: ${response.status} - ${errorData}`;
    }
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async function sendData() {
    console.log("Sending data...");
    if (isProcessing === true) return;

    const imageBase64URL = captureImage();
    console.log("Captured image:", imageBase64URL);
    if (!imageBase64URL) {
      setResponse("Failed to capture image. Stream might not be active.");
      return;
    }

    try {
      const responseText = await sendChatCompletionRequest(
        instruction,
        imageBase64URL
      );
      setResponse(responseText);
    } catch (error) {
      console.error("Error sending data:", error);
      setResponse(`Error: sending data`);
    }
  }

  function handleStartStop() {
    if (isProcessing) {
      // Stop processing
      setIsProcessing(false);
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      setResponse((prev) =>
        prev.startsWith("Processing started...") ? "Processing stopped." : prev
      );
    } else {
      // Start processing
      if (!stream) {
        setResponse("Camera not available. Cannot start.");
        alert("Camera not available. Please grant permission first.");
        return;
      }

      // Make sure video is ready before starting
      const video = videoRef.current;
      if (!video || !video.videoWidth || video.videoWidth === 0) {
        setResponse(
          "Video stream not ready. Please wait a moment and try again."
        );
        return;
      }

      setIsProcessing(true);
      console.log("Processing started");
      setResponse("Processing has started...");

      // Initial immediate call with a short delay to ensure video is ready
      setTimeout(() => {
        sendData();

        // Then set interval
        const intervalMs = parseInt(intervalValue, 10);
        intervalIdRef.current = setInterval(sendData, intervalMs);
      }, 100);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 p-5 min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mt-4">LLAMA Stream</h1>

      <video
        ref={videoRef}
        className="w-[480px] h-[360px] border-2 border-gray-800 bg-black rounded-lg"
        autoPlay
        playsInline
      ></video>

      <canvas ref={canvasRef} className="hidden"></canvas>

      <div className="flex flex-col gap-3 w-full max-w-xl bg-white p-4 rounded-lg shadow">
        <div>
          <label htmlFor="baseURL" className="font-bold block mb-1">
            Base API:
          </label>
          <input
            id="baseURL"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        <div>
          <label htmlFor="instructionText" className="font-bold block mb-1">
            Instruction:
          </label>
          <textarea
            id="instructionText"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={isProcessing}
            className="w-full h-12 p-2 border border-gray-300 rounded"
          ></textarea>
        </div>

        <div>
          <label htmlFor="responseText" className="font-bold block mb-1">
            Response:
          </label>
          <textarea
            id="responseText"
            value={response}
            readOnly
            placeholder="Server response will appear here..."
            className="w-full h-12 p-2 border border-gray-300 rounded bg-gray-50"
          ></textarea>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow">
        <label htmlFor="intervalSelect" className="font-bold">
          Interval between 2 requests:
        </label>
        <select
          id="intervalSelect"
          value={intervalValue}
          onChange={(e) => setIntervalValue(e.target.value)}
          disabled={isProcessing}
          className="p-2 border border-gray-300 rounded"
        >
          <option value="100">100ms</option>
          <option value="250">250ms</option>
          <option value="500">500ms</option>
          <option value="1000">1s</option>
          <option value="2000">2s</option>
        </select>

        <button
          onClick={handleStartStop}
          className={`px-5 py-2.5 text-white font-medium rounded ${
            isProcessing
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isProcessing ? "Stop" : "Start"}
        </button>
      </div>
    </div>
  );
}
