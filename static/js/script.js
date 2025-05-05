const uploadButton = document.getElementById('uploadButton');
const pdfFile = document.getElementById('pdfFile');
const statusText = document.getElementById('statusText');
const loader = document.getElementById('loader');
const uploadedFileNameDiv = document.getElementById('uploadedFileName');
const uploadContainer = document.getElementById('uploadContainer');
const chatSection = document.getElementById('chatSection');
const chatArea = document.getElementById('chatArea');
const questionInput = document.getElementById('questionInput');
const sendButton = document.getElementById('sendButton');
const historyButton = document.getElementById('historyButton');
const historyPanel = document.getElementById('historyPanel');

function disableChat(message = "Processing...") {
  questionInput.disabled = true;
  sendButton.disabled = true;
  statusText.textContent = message;
  loader.classList.remove('hidden');
}

function enableChat(message = "Ready for next question.") {
  questionInput.disabled = false;
  sendButton.disabled = false;
  statusText.textContent = message;
  loader.classList.add('hidden');
  questionInput.focus();
}

function updateStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.className = isError ? 'text-error text-sm' : 'text-base-content/70 text-sm';
}

function displayMessage(text, sender, isLoading = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender === 'user' ? 'message-user' : 'message-ai'}`;

  if (isLoading && sender === 'ai') {
    messageDiv.innerHTML = '<b class="loading-dots">...</b>';
    messageDiv.id = 'loadingMessage';
  } else {
    messageDiv.innerHTML = sender === 'ai' ? marked.parse(text) : text;
  }

  chatArea.appendChild(messageDiv);
  chatArea.scrollTop = chatArea.scrollHeight;

  if (!isLoading) {
    saveChatHistory(text, sender);
  }
}

function saveChatHistory(text, sender) {
  const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  history.push({ text, sender });
  localStorage.setItem('chatHistory', JSON.stringify(history));
}

function toggleChatHistory() {
  if (historyPanel.classList.contains('hidden')) {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    historyPanel.innerHTML = ''; // Clear previous content
    if (history.length === 0) {
      const noHistory = document.createElement('p');
      noHistory.className = 'text-base-content/50';
      noHistory.textContent = 'No previous chats found.';
      historyPanel.appendChild(noHistory);
    } else {
      history.forEach(entry => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        const senderBold = document.createElement('b');
        senderBold.className = entry.sender === 'user' ? 'history-user' : 'history-ai';
        senderBold.textContent = entry.sender === 'user' ? 'You:' : 'AI:';
        historyItem.appendChild(senderBold);
        let historyMardown = document.createElement("div");
        historyMardown.innerHTML = marked.parse(entry.text)
        historyItem.appendChild(historyMardown)
        historyPanel.appendChild(historyItem);
      });
    }
    historyPanel.classList.remove('hidden');
    historyButton.textContent = "Hide History";
  } else {
    historyPanel.classList.add('hidden');
    historyButton.textContent = "Show History";
  }
}

async function uploadPDF() {
  if (!pdfFile.files.length) {
    Swal.fire('Error', 'Please select a PDF first.', 'error');
    return;
  }

  const file = pdfFile.files[0];
  const formData = new FormData();
  formData.append('file', file);

  uploadedFileNameDiv.textContent = "";
  disableChat("Uploading PDF...");
  uploadButton.disabled = true;

  try {
    const response = await fetch('/upload', { method: 'POST', body: formData });
    const result = await response.json();

    if (response.ok) {
      uploadContainer.classList.add('hidden');
      chatSection.classList.remove('hidden');
      chatArea.innerHTML = "";

      localStorage.setItem('pdfName', file.name);

      displayMessage(`You can now ask about **${file.name}**!`, 'ai');
      enableChat(`Ready to chat about ${file.name}!`);
    } else {
      Swal.fire('Upload Failed', result.error || 'Error uploading file.', 'error');
      updateStatus("Upload failed.", true);
      enableChat("Upload failed. Try again.");
    }
  } catch (error) {
    console.error("Upload error:", error);
    Swal.fire('Network Error', 'Could not connect to server. Check console.', 'error');
    updateStatus("Upload failed (network error).", true);
    enableChat("Upload failed. Try again.");
  } finally {
    uploadButton.disabled = false;
    pdfFile.value = "";
  }
}

async function askQuestion() {
  const question = questionInput.value.trim();
  if (!question || questionInput.disabled) return;

  displayMessage(question, 'user');
  questionInput.value = '';
  disableChat("Getting answer...");
  displayMessage('', 'ai', true);

  try {
    const response = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    const result = await response.json();
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) loadingMessage.remove();

    if (response.ok) {
      displayMessage(result.answer, 'ai');
    } else {
      displayMessage(`Error: ${result.error || 'Failed to get answer.'}`, 'ai');
    }
  } catch (error) {
    console.error("Ask error:", error);
    displayMessage("Network error while asking. See console.", 'ai');
  } finally {
    enableChat("Ask more questions!");
  }
}

function DeleteHistory() {
  localStorage.removeItem("chatHistory");
}


const deleteHistory = document.getElementById("historyButtondel");
deleteHistory.addEventListener('click', DeleteHistory);

uploadButton.addEventListener('click', uploadPDF);
sendButton.addEventListener('click', askQuestion);
questionInput.addEventListener('keypress', e => {
  if (e.key === 'Enter' && !questionInput.disabled) {
    e.preventDefault();
    askQuestion();
  }
});
historyButton.addEventListener('click', toggleChatHistory);

// On load

/* const InitialLoading =  localStorage.getItem("pdfName") || '[]';

if (InitialLoading == '[]'){
  chatSection.classList.add('hidden');
  uploadContainer.classList.remove('hidden');
} else {
  chatSection.classList.remove('hidden');
  uploadContainer.classList.add('hidden');
}
*/
chatSection.classList.add('hidden');
uploadContainer.classList.remove('hidden');
