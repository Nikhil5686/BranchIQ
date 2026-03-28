import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";

const VoiceInput = ({ onInterim, onFinal, isProcessing }) => {
  const { language } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef(null);

  const langMap = {
    English: "en-IN",
    Hindi: "hi-IN",
    Gujarati: "gu-IN",
    Tamil: "ta-IN",
    Telugu: "te-IN",
    Marathi: "mr-IN",
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTimeout(() => setErrorMsg("Please use Chrome or Edge for voice input"), 0);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg("");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) onInterim(interimTranscript);
      if (finalTranscript) {
        onFinal(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setErrorMsg(
          "Microphone access denied. Please allow mic in browser settings.",
        );
      } else if (event.error === "no-speech") {
        setErrorMsg("No speech detected. Please try again.");
      } else {
        setErrorMsg(`Error: ${event.error}`);
      }

      setTimeout(() => setErrorMsg(""), 4000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onInterim, onFinal]);

  const toggleListen = () => {
    if (errorMsg === "Please use Chrome or Edge for voice input") return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.lang = langMap[language] || "en-IN";
        try {
          recognitionRef.current.start();
        } catch {
          // ignore empty block error
        }
      }
    }
  };

  let buttonClasses =
    "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all relative z-10 ";
  if (isProcessing) {
    buttonClasses += "bg-[#633806] text-white shadow-md";
  } else if (isListening) {
    buttonClasses +=
      "bg-[#791F1F] text-white shadow-[0_0_15px_rgba(121,31,31,0.6)]";
  } else {
    buttonClasses += "bg-gray-100 text-[#185FA5] hover:bg-gray-200";
  }

  return (
    <div className="relative flex items-center justify-center">
      {isListening && (
        <div className="absolute inset-0 rounded-full border-2 border-[#791F1F] animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-60"></div>
      )}

      <button
        onClick={toggleListen}
        disabled={isProcessing}
        className={buttonClasses}
        title="Voice Input"
      >
        {isProcessing ? (
          <svg
            className="animate-spin w-5 h-5 text-white"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill={isListening ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </button>

      {errorMsg && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-red-100/95 text-red-700 px-3 py-1.5 text-xs font-semibold rounded shadow-md whitespace-nowrap z-50 border border-red-200 backdrop-blur-sm">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
