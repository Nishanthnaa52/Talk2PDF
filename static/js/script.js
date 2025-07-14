// Configure marked.js for better markdown rendering
marked.setOptions({
  breaks: true, // Convert single line breaks to <br>
  gfm: true,    // Enable GitHub Flavored Markdown
});

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
const skipViewBtn = document.getElementById('skip-view');
const backToBtn = document.getElementById('backToBtn')

console.log("The Js file is running..");

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
  // Add a class for markdown styling on AI messages
  const messageClasses = `message ${sender === 'user' ? 'message-user' : 'message-ai'}`;
  messageDiv.className = messageClasses;

  if (isLoading && sender === 'ai') {
    messageDiv.innerHTML = '<b class="loading-dots">...</b>';
    messageDiv.id = 'loadingMessage';
  } else {
    if (sender === 'ai') {
      // Render markdown for AI messages
      messageDiv.innerHTML = marked.parse(text);
    } else {
      // Use textContent for user messages to prevent HTML injection
      messageDiv.textContent = text;
    }
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
        
        const historyContent = document.createElement("div");
        // Only parse markdown for AI messages in history
        if (entry.sender === 'ai') {
          historyContent.innerHTML = marked.parse(entry.text);
        } else {
          historyContent.textContent = entry.text;
        }
        historyItem.appendChild(historyContent);
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

const toggleImagesButton = document.getElementById('toggleImagesButton');
const imageContainer = document.getElementById('image-container');

function toggleImages() {
    const isHidden = imageContainer.classList.toggle('hidden');
    toggleImagesButton.textContent = isHidden ? 'Show Images' : 'Hide Images';
}

toggleImagesButton.addEventListener('click', toggleImages);

async function uploadPDF() {
  if (!pdfFile.files.length) {
    Swal.fire('Error', 'Please select a PDF first.', 'error');
    return;
  }

  const file = pdfFile.files[0];
  const chatType = document.querySelector('input[name="chat_type"]:checked').value;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('chat_type', chatType);

  uploadedFileNameDiv.textContent = "";
  // Improved progress feedback
  disableChat("Uploading PDF...");
  updateStatus("Uploading PDF...", false);
  uploadButton.disabled = true;

  // Hide image container on new upload and reset button text
  imageContainer.classList.add('hidden');
  toggleImagesButton.textContent = 'Show Images';


  try {
    updateStatus("Processing: Uploading file...", false);
    const response = await fetch('/upload', { method: 'POST', body: formData });
    
    updateStatus("Processing: Analyzing content...", false);
    const result = await response.json();

    if (response.ok) {
      uploadContainer.classList.add('hidden');
      chatSection.classList.remove('hidden');
      chatArea.innerHTML = "";

      localStorage.setItem('pdfName', file.name);

      displayMessage(`You can now ask about **${file.name}**!`, 'ai');
      enableChat(`Ready to chat about ${file.name}!`);
      updateStatus(`Ready to chat about ${file.name}!`, false);

      // Handle extracted images
      if (result.images && result.images.length > 0) {
        const imageGrid = document.getElementById('image-grid');
        imageGrid.innerHTML = ''; // Clear previous images

        result.images.forEach(imageData => {
          const card = document.createElement('div');
          card.className = 'card bg-base-100 shadow-xl';

          const figure = document.createElement('figure');
          figure.className = 'image-grid-item'; // Apply sizing class
          const img = document.createElement('img');
          img.src = imageData.path;
          img.alt = 'Extracted Image';
          figure.appendChild(img);

          const cardBody = document.createElement('div');
          cardBody.className = 'card-body';
          const explanation = document.createElement('p');
          explanation.innerHTML = marked.parse(imageData.explanation);
          cardBody.appendChild(explanation);

          card.appendChild(figure);
          card.appendChild(cardBody);
          imageGrid.appendChild(card);
        });

        toggleImagesButton.classList.remove('hidden');
        // Don't show the container by default
        // imageContainer.classList.remove('hidden'); 
      } else {
        // Hide the toggle button if there are no images
        toggleImagesButton.classList.add('hidden');
      }

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

skipViewBtn.addEventListener("click", () => {
  console.log("Is working...");
  chatSection.classList.remove("hidden");
  uploadContainer.classList.add("hidden");
})

backToBtn.addEventListener("click", () => {
  chatSection.classList.add("hidden");
  uploadContainer.classList.remove("hidden");
})


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
      // Display the image if it exists
      if (result.image) {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'message message-ai'; // Style as an AI message
        
        const card = document.createElement('div');
        card.className = 'card bg-base-100 shadow-xl';

        const figure = document.createElement('figure');
        figure.className = 'chat-image'; // Apply sizing class
        const img = document.createElement('img');
        img.src = result.image.path;
        img.alt = 'Relevant Image';
        figure.appendChild(img);

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        const explanation = document.createElement('p');
        explanation.innerHTML = marked.parse(result.image.explanation);
        cardBody.appendChild(explanation);

        card.appendChild(figure);
        card.appendChild(cardBody);
        imageDiv.appendChild(card);
        chatArea.appendChild(imageDiv);
      }
      
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