/* L'OREAL BEAUTY AI ASSISTANT */
/* Project 8 - Chatbot JavaScript */

// Replace this URL after deploying your Cloudflare Worker.
// Never put an OpenAI API key in this file.
const WORKER_URL = "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE";

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

// Keep the system prompt on the Worker for security.
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
    "Bonjour! ✨ Welcome to your L'Oréal-inspired Beauty AI Assistant! " +
      "I'm here to help with skincare routines, makeup tips, " +
      "haircare advice, and beauty product questions. " +
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
  const message = question.trim();

  if (!message || isLoading) {
    return;
  }

  // Show the user's question.
  addMessage(message, "user");

  // Bonus: display the latest question.
  latestQuestion.textContent = "Latest question: " + message;

  userInput.value = "";

  // Bonus: remember conversation history.
  conversationHistory.push({
    role: "user",
    content: message,
  });

  // Keep a limited amount of history for this demo.
  conversationHistory = conversationHistory.slice(-20);

  // The Worker has not been configured yet.
  if (WORKER_URL.includes("PASTE_YOUR_")) {
    addMessage(
      "The chatbot interface is ready! " +
        "Next, connect the Cloudflare Worker to enable AI responses.",
      "system",
    );

    // Remove the unanswered question from API history.
    conversationHistory.pop();
    return;
  }

  setLoading(true);

  // Display a temporary loading bubble.
  const loadingMessage = addMessage(
    "Thinking about your beauty question...",
    "ai",
  );

  try {
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

    if (!response.ok) {
      throw new Error(
        data.error?.message ||
          data.error ||
          "The chatbot service is temporarily unavailable.",
      );
    }

    const answer = data.choices?.[0]?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("The AI returned an empty response.");
    }

    // Remove the loading bubble.
    loadingMessage.remove();

    // Display the AI response.
    addMessage(answer, "ai");

    // Save the response for follow-up questions.
    conversationHistory.push({
      role: "assistant",
      content: answer,
    });

    conversationHistory = conversationHistory.slice(-20);
  } catch (error) {
    loadingMessage.remove();

    console.error("Chatbot error:", error);

    addMessage(
      "Sorry, I couldn't get a response right now. " +
        "Please try again in a moment.",
      "system",
    );

    // Remove the failed question from API history.
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

/* Handle suggested questions */
suggestionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.question);
  });
});

/* Clear the conversation */
clearChatBtn.addEventListener("click", () => {
  if (isLoading) {
    return;
  }

  conversationHistory = [];
  chatWindow.innerHTML = "";

  latestQuestion.textContent = "Your latest question will appear here.";

  userInput.value = "";

  showWelcomeMessage();
  userInput.focus();
});

/* Initialize chatbot */
showWelcomeMessage();
