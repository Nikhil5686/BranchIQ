import React, { useState, useEffect, useRef } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { sendMessage } from "../services/api";
import { useLanguage, useT } from "../context/LanguageContext";
import VoiceInput from "./VoiceInput";

const QUICK_CHIPS = [
  "Account balance",
  "Fund transfer",
  "Loan status",
  "Complaint",
  "Block card",
];

const speakText = (text, language) => {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const langMap = {
    English: "en-IN",
    Hindi: "hi-IN",
    Gujarati: "gu-IN",
    Tamil: "ta-IN",
    Telugu: "te-IN",
    Marathi: "mr-IN",
  };
  utterance.lang = langMap[language] || "en-IN";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

const ChatInterface = () => {
  const { language } = useLanguage();
  const t = useT();
  const [messages, setMessages] = useState([
    { id: "welcome", text: t("welcomeMsg"), sender: "ai" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [toastError, setToastError] = useState("");
  const messagesEndRef = useRef(null);

  // Update welcome message when language changes (only if user hasn't chatted)
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "welcome") {
        const newText = t("welcomeMsg");
        if (prev[0].text !== newText) {
          return [{ id: "welcome", text: newText, sender: "ai" }];
        }
      }
      return prev;
    });
  }, [language]); // eslint-disable-line

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

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

  const handleSend = async (text) => {
    if (!text.trim()) return;

    // Add user message
    const newUserMsg = { id: Date.now().toString(), text, sender: "user" };
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");
    setIsTyping(true);

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
        "chat",
        messages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
      );

      const replyText = data.reply;

      const aiResponse = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        sender: "ai",
      };
      setMessages((prev) => [...prev, aiResponse]);
      speakText(replyText, language);
    } catch (error) {
      console.error("Chat API Error:", error);
      setToastError("Connection lost. Retrying...");
      setTimeout(() => setToastError(""), 4000);
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I am having trouble connecting to the backend servers.",
        sender: "ai",
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInterim = (text) => {
    setInputValue(text);
  };

  const handleFinal = (text) => {
    setInputValue(text);
    handleSend(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col h-full w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-white">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
              className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex w-full max-w-[80%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"} items-end gap-3`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${msg.sender === "user" ? "bg-[#27500A]" : "bg-[#185FA5]"}`}
                >
                  {msg.sender === "user" ? "You" : "IQ"}
                </div>

                {/* Bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-[#F4F8FD] text-gray-800 rounded-br-sm border border-blue-50"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-200"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start w-full"
          >
            <div className="flex items-end gap-3 w-full max-w-[80%]">
              <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm bg-[#185FA5]">
                IQ
              </div>
              <div className="px-5 py-4 rounded-2xl bg-gray-100 rounded-bl-sm flex items-center space-x-1.5 shadow-sm h-[48px]">
                <motion.div
                  className="w-2.5 h-2.5 bg-gray-400 rounded-full"
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0,
                  }}
                />
                <motion.div
                  className="w-2.5 h-2.5 bg-gray-400 rounded-full"
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2,
                  }}
                />
                <motion.div
                  className="w-2.5 h-2.5 bg-gray-400 rounded-full"
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.4,
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      <div className="bg-white border-t border-gray-100 p-3 md:p-4 pb-4 md:pb-5">
        {/* Quick Chips Row */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
          }}
          className="flex overflow-x-auto gap-2 pb-3 mb-1 no-scrollbar hide-scroll"
        >
          {t("quickChips").map((chip, idx) => (
            <motion.button
              variants={{
                hidden: { opacity: 0, scale: 0.8 },
                visible: { opacity: 1, scale: 1 },
              }}
              key={idx}
              onClick={() => handleSend(chip)}
              className="flex-shrink-0 px-4 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full text-sm font-semibold hover:bg-[#F4F8FD] hover:text-[#185FA5] hover:border-[#185FA5] transition-all whitespace-nowrap shadow-sm"
            >
              {chip}
            </motion.button>
          ))}
        </motion.div>

        {/* Input Row */}
        <div className="flex items-center gap-2.5">
          {/* Custom Voice Input using Web Speech API */}
          <VoiceInput
            onInterim={handleInterim}
            onFinal={handleFinal}
            isProcessing={isTyping}
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend(inputValue);
              }}
              placeholder="Type your query or click mic to speak..."
              className="w-full bg-gray-50 border border-gray-200 rounded-full pl-5 pr-5 py-3 md:py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-[15px] transition-all text-gray-800 placeholder-gray-400 shadow-inner"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSend(inputValue)}
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white transition-all shadow-md hover:opacity-90 active:scale-95"
            style={{ backgroundColor: "#185FA5" }}
          >
            <svg
              className="w-5 h-5 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .hide-scroll::-webkit-scrollbar {
          display: none;
        }
        .hide-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </motion.div>
  );
};

export default ChatInterface;
