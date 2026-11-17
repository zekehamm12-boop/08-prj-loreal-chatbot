/* L'OREAL BEAUTY AI ASSISTANT */
/* Project 8 - Chatbot JavaScript */

// Cloudflare Worker URL.
// Your OpenAI API key is stored securely in Cloudflare,
// NOT in this JavaScript file.
const WORKER_URL = "https://loreal-beauty-assistant.zekehamm12.workers.dev";

/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const latestQuestion = document.getElementById("latestQuestion");
const suggestionButtons = document.querySelectorAll(".suggestion-btn");

/* Conversation history */
let conversationHistory = [];
let isLoading = false;

// The system prompt and OpenAI API key stay on Cloudflare.
// Only user and assistant messages are sent from the browser.

/* Add a message bubble */
function addMessage(text, sender) {
  const message = document.createElement("div");

  message.classList.add("msg", sender);
  message.textContent = text;

  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return message;
}

/* Show welcome message */
function showWelcomeMessage() {
  addMessage(
    "Bonjour! ✨ Welcome to your L'Oréal-inspired " +
      "Beauty AI Assistant! " +
      "I'm here to help with skincare routines, " +
      "makeup tips, haircare advice, and beauty " +
      "product questions. " +
      "What would you like to explore today?",
    "ai",
  );
}

/* Enable or disable message input */
function setLoading(loading) {
  isLoading = loading;

  sendBtn.disabled = loading;
  userInput.disabled = loading;

  suggestionButtons.forEach((button) => {
    button.disabled = loading;
  });
}

/* Send a message */
async function sendMessage(question) {
  const message = String(question || "").trim();

  if (!message || isLoading) {
    return;
  }

  // Limit each question to 1000 characters.
  if (message.length > 1000) {
    addMessage("Please keep your question under 1000 characters.", "system");
    return;
  }

  // Display the user's message.
  addMessage(message, "user");

  // Bonus: display the latest question.
  if (latestQuestion) {
    latestQuestion.textContent = "Latest question: " + message;
  }

  userInput.value = "";

  // Bonus: remember previous questions and answers.
  conversationHistory.push({
    role: "user",
    content: message,
  });

  // Keep conversation history manageable.
  conversationHistory = conversationHistory.slice(-19);

  setLoading(true);

  // Show a temporary loading bubble.
  const loadingMessage = addMessage(
    "Thinking about your beauty question...",
    "ai",
  );

  try {
    // Send the conversation to Cloudflare.
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
      }),
    });

    const data = await response.json();

    // Handle API and Cloudflare errors.
    if (!response.ok) {
      const errorMessage =
        typeof data.error === "string"
          ? data.error
          : data.error?.message ||
            "The chatbot service is temporarily unavailable.";

      throw new Error(errorMessage);
    }

    // Read the AI response.
    const answer = data.choices?.[0]?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("The AI returned an empty response.");
    }

    // Remove the loading message.
    loadingMessage.remove();

    // Display the AI answer in its own bubble.
    addMessage(answer, "ai");

    // Save the answer for follow-up questions.
    conversationHistory.push({
      role: "assistant",
      content: answer,
    });

    conversationHistory = conversationHistory.slice(-19);
  } catch (error) {
    loadingMessage.remove();

    console.error("Chatbot error:", error);

    // Show a helpful message when the service is disabled.
    if (error.message.includes("not enabled yet")) {
      addMessage(
        "The chatbot is connected to Cloudflare, " +
          "but AI responses have not been enabled yet.",
        "system",
      );
    } else if (error.message.includes("Too many requests")) {
      addMessage(
        "You've reached the question limit. " +
          "Please wait about a minute and try again.",
        "system",
      );
    } else {
      addMessage(
        "Sorry, I couldn't get a response right now. " +
          "Please try again in a moment.",
        "system",
      );
    }

    // Remove the unanswered question from history.
    conversationHistory.pop();
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

/* Handle form submission */
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(userInput.value);
});

/* Handle suggested beauty questions */
suggestionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.question);
  });
});

/* Clear the conversation */
if (clearChatBtn) {
  clearChatBtn.addEventListener("click", () => {
    if (isLoading) {
      return;
    }

    conversationHistory = [];
    chatWindow.innerHTML = "";

    if (latestQuestion) {
      latestQuestion.textContent = "Your latest question will appear here.";
    }

    userInput.value = "";

    showWelcomeMessage();
    userInput.focus();
  });
}

/* Initialize chatbot */
showWelcomeMessage();
