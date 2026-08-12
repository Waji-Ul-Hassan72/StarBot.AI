// src/components/ChatInput.jsx
import React, { useState } from "react";

function ChatInput({ onSendMessage }) {
  const [inputPrompt, setInputPrompt] = useState("");

  const MAX_LIMIT = 1000;
  const isOverLimit = inputPrompt.length > MAX_LIMIT;
  const isEmpty = !inputPrompt.trim();
  const excessChars = inputPrompt.length - MAX_LIMIT;

  const handleSubmit = (e) => {
    e.preventDefault();

    // Block submission if over limit or empty
    if (isEmpty || isOverLimit) {
      return;
    }

    onSendMessage(inputPrompt);
    setInputPrompt("");
  };

  return (
    <div className="chat-input-container" style={{ width: "100%" }}>
      <form onSubmit={handleSubmit}>
        <textarea
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Ask a question about US Law..."
          rows={4}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px",
            borderRadius: "6px",
            border: isOverLimit ? "2px solid #ef4444" : "1px solid #ccc",
            outline: "none",
            resize: "vertical",
          }}
        />

        {/* Warning message if character limit is breached */}
        {isOverLimit && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fca5a5",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "13px",
              marginTop: "6px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>⚠️</span>
            <span>
              <strong>Cannot send message:</strong> Your input exceeds the 1,000-character limit by <strong>{excessChars}</strong> character{excessChars > 1 ? "s" : ""}. Please shorten your prompt to send.
            </span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justify: "space-between",
            alignItems: "center",
            marginTop: "8px",
          }}
        >
          {/* Character Counter */}
          <span
            style={{
              color: isOverLimit ? "#ef4444" : "#6b7280",
              fontWeight: isOverLimit ? "bold" : "normal",
              fontSize: "13px",
            }}
          >
            {inputPrompt.length} / {MAX_LIMIT} characters
          </span>

          {/* Send Button Wrapper for Hover Tooltip */}
          <div
            title={
              isOverLimit
                ? "Cannot send: Input exceeds the 1,000 character limit."
                : isEmpty
                ? "Please enter a question to send."
                : ""
            }
          >
            <button
              type="submit"
              disabled={isEmpty || isOverLimit}
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                backgroundColor: isEmpty || isOverLimit ? "#9ca3af" : "#2563eb",
                color: "#ffffff",
                border: "none",
                cursor: isEmpty || isOverLimit ? "not-allowed" : "pointer",
                fontWeight: "600",
                transition: "background-color 0.2s ease",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ChatInput;