import React from "react";
import ChatInterface from "../components/ChatInterface";

function CustomerChat() {
  return (
    <div className="h-full bg-white flex flex-col pt-2 pb-6 px-4 md:px-8">
      <div className="mb-4">
        <p className="text-gray-500 font-medium">
          Hello, how can we help you today?
        </p>
      </div>
      <div className="flex-1 min-h-0 bg-gray-50/50 p-2 md:p-6 rounded-2xl border border-gray-100">
        <ChatInterface />
      </div>
    </div>
  );
}

export default CustomerChat;
