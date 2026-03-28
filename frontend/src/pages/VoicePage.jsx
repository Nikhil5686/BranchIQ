import React, { useState, useEffect, useRef } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { sendMessage } from "../services/api";
import { useLanguage, useT, LANGUAGES } from "../context/LanguageContext";

const LANG_CODES = {
  English: "en",
  Hindi: "hi",
  Gujarati: "gu",
  Tamil: "ta",
  Telugu: "te",
  Marathi: "mr",
  Bengali: "bn",
  Kannada: "kn",
  Punjabi: "pa",
  Odia: "or",
};

const speakText = (text, language) => {
  if (!("speechSynthesis" in window)) return;
  const langObj = LANGUAGES.find((l) => l.name === language);
  const targetLang = langObj ? langObj.code : "en-IN";

  const doSpeak = (voices) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    // Pick best matching voice: exact match first, then base language match
    const exactMatch = voices.find((v) => v.lang === targetLang);
    const baseCode = targetLang.split("-")[0];
    const baseMatch = voices.find((v) => v.lang.startsWith(baseCode));
    const chosenVoice = exactMatch || baseMatch || null;
    if (chosenVoice) utterance.voice = chosenVoice;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Voices may not be loaded yet on first call — wait for them
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    doSpeak(voices);
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      const loadedVoices = window.speechSynthesis.getVoices();
      doSpeak(loadedVoices);
      window.speechSynthesis.onvoiceschanged = null;
    };
  }
};

// SVG Icon
const MicIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
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
);

const VoicePage = () => {
  const { language, setLanguage } = useLanguage();
  const t = useT();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [toastError, setToastError] = useState("");

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg(
        "Browser not supported. Please use Chrome or Edge for voice input.",
      );
      return;
    }

    // Stop any active recognition before re-creating
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore block error
      }
    }

    const langObj = LANGUAGES.find((l) => l.name === language);
    const langCode = langObj ? langObj.code : "en-IN";

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = langCode; // ← set language on creation

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg("");
      setInterimText("");
      setAiResponse("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimText(interim);
      if (final) setFinalText(final);
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
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
        // ignore block error
      }
      }
      window.speechSynthesis.cancel();
    };
  }, [language]); // ← re-init whenever language changes

  const getSessionId = () => {
    let sid = sessionStorage.getItem("branchiq_session_id");
    if (!sid) {
      sid = crypto?.randomUUID
        ? crypto.randomUUID()
        : "sess-" + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("branchiq_session_id", sid);
    }
    return sid;
  };

  const handleSendQuery = async (text) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setAiResponse("");
    setInterimText("");

    const LANG_CODES = {
      English: "en",
      Hindi: "hi",
      Gujarati: "gu",
      Tamil: "ta",
      Telugu: "te",
      Marathi: "mr",
    };

    try {
      const data = await sendMessage(
        getSessionId(),
        text,
        LANG_CODES[language] || "en",
        "voice",
        [],
      );

      const replyText = data.reply;
      setAiResponse(replyText);
      speakText(replyText, language);
    } catch (error) {
      console.error("Voice API Error:", error);
      setToastError("Connection lost. Retrying...");
      setTimeout(() => setToastError(""), 4000);
      setAiResponse("I am having trouble connecting to the backend servers.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // We only trigger API auto-send when finalText updates
    if (finalText && !isListening && !isProcessing) {
      handleSendQuery(finalText);
    }
    // eslint-disable-next-line
  }, [finalText, isListening]);

  const toggleListen = () => {
    if (errorMsg.includes("Browser not supported")) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else if (!isProcessing) {
      if (recognitionRef.current) {
        setFinalText("");
        setInterimText("");
        setAiResponse("");
        setErrorMsg("");
        // lang is already set on the recognition instance from useEffect
        try {
          recognitionRef.current.start();
        } catch {
        // ignore block error
      }
      }
    }
  };

  const handleChipClick = (chipText) => {
    setFinalText(chipText);
    handleSendQuery(chipText);
  };

  let statusText = "Click mic to start speaking";
  let statusColor = "text-gray-500";

  if (isListening) {
    statusText = t("listening");
    statusColor = "text-red-500 font-bold animate-pulse";
  } else if (isProcessing) {
    statusText = t("processing");
    statusColor = "text-amber-500 font-bold animate-pulse";
  } else if (aiResponse) {
    statusText = t("speakAgain");
    statusColor = "text-[#0C447C] font-semibold";
  } else if (errorMsg) {
    if (errorMsg.includes("denied")) {
      statusText =
        "Mic Access Denied. Click the 'lock' icon in your browser URL bar to allow.";
    } else {
      statusText = errorMsg;
    }
    statusColor = "text-[#791F1F] font-bold";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full w-full bg-[#F4F8FD] flex flex-col items-center pt-10 pb-6 px-4 relative overflow-hidden"
    >
      {/* Error Toast */}
      <AnimatePresence>
        {toastError && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-[#791F1F] text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
          >
            {toastError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-[#0C447C] tracking-tight mb-2">
          {t("voiceTitle")}
        </h1>
        <p className="text-lg text-gray-500 font-medium tracking-wide">
          {t("voiceSubtitle")}
        </p>
      </div>

      {/* 2. Large Mic Button */}
      <div className="relative flex justify-center items-center w-64 h-64 mb-6">
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{ opacity: 0, scale: 2 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                className="absolute w-[100px] h-[100px] bg-red-400 rounded-full"
              />
              <motion.div
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{ opacity: 0, scale: 2.5 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.4,
                }}
                className="absolute w-[100px] h-[100px] bg-red-300 rounded-full"
              />
            </>
          )}
        </AnimatePresence>

        <motion.button
          onClick={toggleListen}
          disabled={isProcessing}
          whileHover={!isProcessing ? { scale: 1.05 } : {}}
          whileTap={!isProcessing ? { scale: 0.95 } : {}}
          className={`relative z-10 w-[100px] h-[100px] rounded-full flex items-center justify-center shadow-xl transition-colors duration-300 outline-none ${
            isProcessing
              ? "bg-amber-400 cursor-not-allowed"
              : isListening
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-100 hover:bg-blue-200 cursor-pointer"
          }`}
        >
          <MicIcon
            className={`w-12 h-12 ${isListening || isProcessing ? "text-white" : "text-[#0C447C]"}`}
          />
        </motion.button>
      </div>

      {/* 3. Status Text */}
      <div className="h-8 mb-8 text-center">
        <span
          className={`text-xl ${statusColor} transition-colors duration-300`}
        >
          {statusText}
        </span>
      </div>

      {/* 4. & 5. Transcript & AI Box */}
      <div className="w-full max-w-2xl h-56 relative overflow-hidden rounded-2xl shadow-inner bg-gray-50 border border-gray-100 p-8 flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {aiResponse ? (
            <motion.div
              key="response"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              className="w-full h-full bg-[#E6F1FB] rounded-xl p-6 overflow-y-auto border border-blue-100 shadow-sm flex items-center justify-center"
            >
              <p className="text-2xl text-[#0C447C] font-semibold leading-relaxed">
                {aiResponse}
              </p>
            </motion.div>
          ) : interimText || finalText ? (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full text-center"
            >
              <p className="text-3xl font-bold text-gray-800 tracking-tight">
                {finalText}{" "}
                <span className="text-gray-400 font-medium">{interimText}</span>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                <MicIcon className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 text-lg font-medium">
                Your transcript will appear here...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 6. Quick Chips */}
      <div className="mt-10 flex flex-wrap justify-center gap-3 max-w-3xl">
        {t("quickChips").map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleChipClick(chip)}
            disabled={isProcessing || isListening}
            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:border-blue-300 hover:text-[#0C447C] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* 7. Language Support Pills */}
      <div className="mt-auto pt-6 flex flex-wrap justify-center items-center gap-2 max-w-3xl">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2">
          Language:
        </span>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.name}
            onClick={() => setLanguage(lang.name)}
            disabled={isProcessing || isListening}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${
              language === lang.name
                ? "bg-[#0C447C] text-white border-[#0C447C] shadow-md scale-105"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default VoicePage;
