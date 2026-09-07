"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FILLER_WORDS = [
  "um", "uh", "like", "you know", "basically", "literally",
  "actually", "so yeah", "right", "okay so", "hmm",
  "sort of", "kind of", "i mean",
];

function detectFillers(text) {
  const lower = text.toLowerCase();
  const found = [];
  let total = 0;
  for (const filler of FILLER_WORDS) {
    const escaped = filler.replace(/\s+/g, "\\s+");
    const regex = new RegExp(`\\b${escaped}\\b`, "g");
    const matches = lower.match(regex) || [];
    if (matches.length) {
      found.push({ word: filler, count: matches.length });
      total += matches.length;
    }
  }
  return { found, total };
}

function fmt(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function VoiceRecorder({ onTranscriptReady, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [duration, setDuration] = useState(0);
  const [fillerInfo, setFillerInfo] = useState({ found: [], total: 0 });
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const finalRef = useRef("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) setSupported(false);
    }
    return () => {
      recognitionRef.current?.stop();
      clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    finalRef.current = "";
    setTranscript("");
    setInterim("");
    setDuration(0);
    setFillerInfo({ found: [], total: 0 });

    recognition.onresult = (event) => {
      let finalPart = "";
      let interimPart = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalPart += chunk;
        } else {
          interimPart += chunk;
        }
      }
      finalRef.current += finalPart;
      setTranscript(finalRef.current);
      setInterim(interimPart);
      setFillerInfo(detectFillers(finalRef.current + interimPart));
    };

    recognition.onerror = () => {};

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterim("");
    clearInterval(timerRef.current);

    const finalDuration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const text = finalRef.current.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const wpm = finalDuration > 5 ? Math.round((wordCount / finalDuration) * 60) : 0;
    const fillers = detectFillers(text);

    onTranscriptReady({
      text,
      duration: finalDuration,
      wordCount,
      wpm,
      fillerCount: fillers.total,
      fillerWords: fillers.found,
    });
  };

  if (!supported) {
    return (
      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
        Voice recording requires Chrome or Edge. Switch to text mode to continue.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          type="button"
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          className="h-12 w-12 rounded-full shrink-0"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
        >
          {isRecording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {isRecording ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="font-mono text-sm text-red-500">{fmt(duration)}</span>
            {fillerInfo.total > 0 && (
              <Badge
                variant="outline"
                className="border-amber-400 text-amber-600 text-xs"
              >
                {fillerInfo.total} filler{fillerInfo.total > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        ) : transcript ? (
          <p className="text-xs text-muted-foreground">
            Done — submit or re-record
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Press to start recording your answer
          </p>
        )}
      </div>

      {(transcript || interim) && (
        <div className="min-h-24 rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
          <span>{transcript}</span>
          {interim && (
            <span className="text-muted-foreground"> {interim}</span>
          )}
        </div>
      )}
    </div>
  );
}
