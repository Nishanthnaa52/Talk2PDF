import os
import shutil
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, session
from werkzeug.utils import secure_filename

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate # Optional: For custom prompts
from langchain.memory import ConversationBufferMemory # Optional: To add memory

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
# Consider using Flask's secret key management for production
# For demo purposes, a simple key is used. CHANGE THIS in a real app!
SECRET_KEY = 'your-very-secret-key'

# --- Load Environment Variables ---
load_dotenv()
if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY not found in environment variables.")

# --- Flask App Setup ---
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SECRET_KEY'] = SECRET_KEY
app.config['SESSION_TYPE'] = 'filesystem' # Store session data on the server filesystem

# Ensure the upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# --- Global Store (Simplified - NOT SUITABLE FOR PRODUCTION/MULTIPLE USERS) ---
# In a real app, use sessions, databases, or caching to manage chains per user/session.
# This simple global variable will be overwritten by each new upload.
qa_chain_store = {} # Use a dictionary to potentially store multiple chains later if needed
current_chain_key = "default_chain" # Simple key for the single global chain

# --- Helper Functions ---
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- Core LangChain Logic ---
def setup_qa_system(file_path: str, embedding_model: str = "models/embedding-001", chat_model: str = "gemini-1.0-pro"):
    """Sets up the QA system for a given PDF file."""
    try:
        print(f"Processing document: {file_path}")
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        if not docs:
            print("Warning: No documents loaded from PDF.")
            return None

        print("Splitting documents...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunked_docs = text_splitter.split_documents(docs)
        print(f"Created {len(chunked_docs)} chunks.")
        if not chunked_docs:
            print("Warning: No chunks created after splitting.")
            return None

        print(f"Initializing Embeddings: {embedding_model}")
        gemini_embeddings = GoogleGenerativeAIEmbeddings(model=embedding_model)

        print("Creating FAISS vector store...")
        vectorstore = FAISS.from_documents(chunked_docs, gemini_embeddings)
        retriever = vectorstore.as_retriever()

        print(f"Initializing Chat Model: {chat_model}")
        llm = ChatGoogleGenerativeAI(
            model=chat_model,
            temperature=0.3, # Slightly increased temperature for potentially more varied answers
            convert_system_message_to_human=True
        )

        # Optional: Add memory for conversation context
        # memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

        # Optional: Define a custom prompt template
        # template = """Use the following pieces of context to answer the question at the end.
        # If you don't know the answer, just say that you don't know, don't try to make up an answer.
        # Keep the answer concise.
        # Context: {context}
        # Question: {question}
        # Helpful Answer:"""
        # QA_CHAIN_PROMPT = PromptTemplate.from_template(template)

        print("Creating RetrievalQA chain...")
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            retriever=retriever,
            chain_type="stuff", # Try "refine" or others if "stuff" doesn't work well
            return_source_documents=False, # Set to True if you want sources on backend
            # chain_type_kwargs={"prompt": QA_CHAIN_PROMPT} # Uncomment to use custom prompt
            # memory=memory # Uncomment to add memory
        )
        print("QA system setup complete.")
        return qa_chain

    except Exception as e:
        print(f"Error during QA system setup: {e}")
        return None

# --- Flask Routes ---
@app.route('/')
def index():
    """Renders the main chat page."""
    # Clear previous session data if desired
    session.pop('pdf_processed', None)
    session.pop('pdf_filename', None)
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handles PDF file uploads and processes them."""
    global qa_chain_store # Modifying the global store

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # --- Cleanup old files (optional, for single-file demo) ---
        # In a multi-user scenario, you wouldn't do this globally
        try:
            for f in os.listdir(app.config['UPLOAD_FOLDER']):
                os.remove(os.path.join(app.config['UPLOAD_FOLDER'], f))
            print("Cleaned up old uploads.")
        except Exception as e:
            print(f"Error cleaning up uploads: {e}")
        # --- End Cleanup ---

        try:
            file.save(filepath)
            print(f"File saved to: {filepath}")

            # Process the PDF and create the QA chain
            # Use a robust model like gemini-1.5-pro-latest if available and suitable
            new_qa_chain = setup_qa_system(filepath, chat_model="gemini-1.5-flash")

            if new_qa_chain:
                # Store the chain (replace the existing one in this simple setup)
                qa_chain_store[current_chain_key] = new_qa_chain
                session['pdf_processed'] = True # Mark in session that PDF is ready
                session['pdf_filename'] = filename # Store filename in session
                print("QA Chain created and stored.")
                return jsonify({"message": f"File '{filename}' uploaded and processed successfully. Ready to chat!"})
            else:
                # Cleanup failed upload
                if os.path.exists(filepath):
                    os.remove(filepath)
                session.pop('pdf_processed', None)
                session.pop('pdf_filename', None)
                return jsonify({"error": "Failed to process the PDF file."}), 500

        except Exception as e:
            # Cleanup potentially saved file on error
            if os.path.exists(filepath):
               os.remove(filepath)
            session.pop('pdf_processed', None)
            session.pop('pdf_filename', None)
            print(f"Error during upload/processing: {e}")
            return jsonify({"error": f"An error occurred: {e}"}), 500
    else:
        return jsonify({"error": "File type not allowed (only PDF)"}), 400

@app.route('/ask', methods=['POST'])
def ask_question():
    """Handles incoming questions and returns answers from the QA chain."""
    if not session.get('pdf_processed'):
         return jsonify({"error": "Please upload and process a PDF first."}), 400

    data = request.get_json()
    question = data.get('question')

    if not question:
        return jsonify({"error": "No question provided"}), 400

    # Retrieve the QA chain (from our simple global store)
    qa_chain = qa_chain_store.get(current_chain_key)

    if not qa_chain:
        # This might happen if the server restarted or processing failed earlier
         session.pop('pdf_processed', None) # Reset session state
         session.pop('pdf_filename', None)
         return jsonify({"error": "QA system not initialized. Please re-upload the PDF."}), 500

    try:
        print(f"Received question: {question}")
        # If using memory, you might need to format the input differently
        result = qa_chain.invoke({"query": question})
        answer = result.get("result", "Sorry, I couldn't find an answer.")
        print(f"Generated answer: {answer}")
        return jsonify({"answer": answer})

    except Exception as e:
        print(f"Error invoking QA chain: {e}")
        return jsonify({"error": f"An error occurred while getting the answer: {e}"}), 500

# --- Run the App ---
if __name__ == '__main__':
    # Use host='0.0.0.0' to make it accessible on your network
    # debug=True is useful for development, but REMOVE it for production
    app.run(host='0.0.0.0', port=5000, debug=True)
