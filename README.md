
<p align="center">
  <img src="./templates/logo.svg"/>

</p>

<h1 align="center">Talk2PDF - Chat with your Documents</h1>

Talk2PDF is an intelligent web application that allows you to have interactive conversations with your PDF documents. Upload a PDF, and the app will enable you to ask questions about its content, leveraging powerful AI models to provide accurate answers from the text and even explain images within the document.

This application is built with Flask for the backend, LangChain for orchestrating the language model interactions, and Google's Gemini models for state-of-the-art text and vision understanding.

> [!WARNING]
> ## ⚠️ Disclaimer: For Demonstration Purposes Only
> This application is intended for demonstration and personal use. It is **not suitable for a production environment or multi-user setup** due to the following simplifications:
> - **Global State:** The application uses a single global variable to store the chat model. This means if multiple users upload PDFs at the same time, their sessions will overwrite each other.
> - **File Handling:** The server cleans up all previously uploaded PDFs and extracted images upon a new upload. This is not suitable for concurrent users.
> - **Security:** The default Flask `SECRET_KEY` is hardcoded and must be changed for any real deployment.

## Features

- **Interactive Chat Interface:** Ask questions in natural language and get responses in real-time.
- **PDF Content Analysis:** The system processes the entire text content of your uploaded PDF to provide comprehensive answers.
- **Image Understanding:** (Optional) Extracts images from the PDF, analyzes them, and can answer questions about their content.
- **Deduplication:** Intelligently detects and skips duplicate images within the PDF to save processing time.
- **Chat History:** View your current conversation history.
- **Easy Setup:** Get the application running with just a few simple commands.
- **Secure API Key Handling:** Prompts for your API key if not found in the environment, ensuring it's not hard-coded.

## How It Works

The application follows a sophisticated workflow to process your documents and answer your questions.

### User Flow

This diagram shows the general user interaction with the application, from uploading a PDF to receiving an answer.

![Application Workflow](Images/talk2pdf_workdiagram.jpg)

### Backend Processing (LangChain)

This flowchart details the step-by-step process happening on the backend, powered by LangChain, to create a question-answering system from your PDF.

![LangChain Flowchart](Images/Talk2pdf_Flowchart_with_LangChain.png)

1.  **Upload PDF:** The user uploads a PDF file through the web interface.
2.  **Store File:** The file is temporarily stored on the server.
3.  **Setup QA System:** The core process begins.
4.  **Text Splitting:** The document's text is broken down into smaller, manageable chunks.
5.  **Generate Embeddings:** Each text chunk is converted into a numerical representation (embedding) using Google's AI.
6.  **Create RetrievalQA Chain:** A powerful LangChain component is created, combining the language model with the document embeddings. This allows the system to retrieve relevant text chunks to answer a question.
7.  **Ask Question:** The user asks a question.
8.  **Display Answer:** The system finds the relevant information in the PDF and generates a human-like answer.

## Getting Started

Follow these instructions to set up and run the application on your local machine.

### Prerequisites

- Python 3.8 or higher
- `pip` (Python package installer)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/nishanthnaa52/Talk2pdf
    cd Talk2pdf
    ```

2.  **Install the required packages:**
    ```bash
    pip install -r requirements.txt
    ```

### Configuration

This application requires a Google Gemini API key to function.

1.  **Get your API Key:** Visit the [Google AI Studio](https://aistudio.google.com/app/apikey) to get your free API key.

2.  **Set up the API Key:** You have two options:
    *   **Recommended:** Create a `.env` file in the root directory of the project and add your API key to it:
      ```
      GOOGLE_API_KEY="your_gemini_api_key_here"
      ```
    *   **On-the-fly:** If you run the application without a `.env` file, it will automatically prompt you to enter the API key in the terminal.

> [!IMPORTANT]
> For security, it is also recommended to change the `SECRET_KEY` in the `app.py` file from its default value, especially if you plan to deploy the application.

## Usage

1.  **Run the Flask application:**
    ```bash
    python app.py
    ```

2.  **Open your browser:** Navigate to `http://127.0.0.1:5000`.

3.  **Upload your PDF:**
    - Click the "Choose File" button and select a PDF document.
    - Choose the chat type:
        - **Text Only:** For asking questions about the text content.
        - **Text & Image:** For analyzing both text and images within the PDF.
    - Click "Upload".

4.  **Start Chatting:** Once the file is processed, the chat interface will appear. Type your questions and get answers instantly!

## Technologies Used

- **Backend:** Flask
- **AI Orchestration:** LangChain
- **Language & Vision Models:** Google Gemini (via `langchain-google-genai`). The app uses `gemini-1.5-flash` for both chat and image analysis.
- **Vector Store:** FAISS (Facebook AI Similarity Search)
- **PDF Processing:** PyMuPDF (fitz)
- **Image Processing:** Pillow, imagehash
- **Dependencies:** `numpy`, `tiktoken`
- **Frontend:** HTML, CSS, JavaScript
