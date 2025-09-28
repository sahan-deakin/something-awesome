// Toggle chatbot window
function toggleChatbot() {
    const chatbotWindow = document.getElementById('chatbotWindow');
    chatbotWindow.classList.toggle('active');
}

// Handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Send message to chatbot
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (message === '') return;
    
    // Add user message to chat
    addMessage(message, 'user');
    chatInput.value = '';
    
    // Send to server and get response
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        setTimeout(() => {
            addMessage(data.response, 'bot');
        }, 500);
        
    } catch (error) {
        console.error('Error:', error);
        setTimeout(() => {
            addMessage('Sorry, I encountered an error. Please try again.', 'bot');
        }, 500);
    }
}

function addMessage(message, sender) {
    const chatbotBody = document.getElementById('chatbotBody');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-content">${message}</div>
        <div class="message-time">${timeString}</div>
    `;
    
    chatbotBody.appendChild(messageDiv);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

function scrollToBottom() {
    const chatbotBody = document.getElementById('chatbotBody');
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

document.addEventListener('DOMContentLoaded', function() {
    scrollToBottom();
});