import os
import pickle
import numpy as np
import chromadb
import json
from sentence_transformers import SentenceTransformer
from groq import Groq
from config import settings

class RagService:
    _instance = None

    def __init__(self):
        self.client = None
        self.collection = None
        self.embedder = None
        self.groq_client = None
        self.base_path = os.path.join(os.getcwd(), "app", "data", "models")
        self.is_initialized = False

    def initialize(self):
        if self.is_initialized:
            print("RAG Service already initialized.")
            return

        print("Initializing RAG Service...")
        
        # Load embedding model
        try:
            print("Loading embedding model...")
            self.embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        except Exception as e:
            print(f"Failed to load embedding model: {e}")
            return

        # Load Groq
        if not settings.GROQ_API_KEY:
            print("WARNING: GROQ_API_KEY is not set. Chatbot will fail.")
            self.groq_client = None
        else:
            self.groq_client = Groq(api_key=settings.GROQ_API_KEY)

        # Setup ChromaDB
        try:
            print("Connecting to ChromaDB...")
            chroma_path = os.path.join(self.base_path, "chroma_db")
            self.client = chromadb.PersistentClient(path=chroma_path)
            self.collection = self.client.get_or_create_collection(
                name="seo_rag",
                metadata={"hnsw:space": "cosine"}
            )

            # Check if we need to populate (only if empty)
            if self.collection.count() == 0:
                self._populate_db()
            
            self.is_initialized = True
            print("RAG Service initialized successfully.")
        except Exception as e:
            print(f"Failed to initialize ChromaDB: {e}")

    def _populate_db(self):
        print("⚠️ ChromaDB empty → Populating from files...")
        try:
            metadata_path = os.path.join(self.base_path, "metadata.pkl")
            vectors_path = os.path.join(self.base_path, "vectors.npy")

            if not os.path.exists(metadata_path) or not os.path.exists(vectors_path):
                print(f"Error: Model files not found at {self.base_path}")
                return

            metadata = pickle.load(open(metadata_path, "rb"))
            vectors = np.load(vectors_path)

            ids = [m["id"] for m in metadata]
            texts = [m["text"] for m in metadata]
            metadatas = [{"source": m["source"], "index": i} for i, m in enumerate(metadata)]

            self.collection.add(
                ids=ids,
                documents=texts,
                metadatas=metadatas,
                embeddings=vectors.tolist()
            )
            print("Inserted", len(ids), "chunks.")
        except Exception as e:
            print(f"Failed to populate DB: {e}")

    def retrieve(self, query: str, top_k=5):
        """Retrieve relevant chunks from Chroma."""
        if not self.is_initialized:
            print("WARNING: RAG Service not initialized. Attempting to initialize...")
            self.initialize()

        print(f"DEBUG: Retrieving for query: '{query}'")
        try:
            query_vec = self.embedder.encode([query]).tolist()

            results = self.collection.query(
                query_embeddings=query_vec,
                n_results=top_k
            )

            documents = results["documents"][0]
            print(f"DEBUG: Found {len(documents)} documents")
            return "\n\n".join(documents)
        except Exception as e:
            print(f"DEBUG: Retrieval error: {e}")
            return ""

    def generate_answer(self, query: str, history: list = None):
        """Generate SEO answer using Groq with history."""
        if not self.groq_client:
            return "Error: Groq API Key is missing. Please configure it in the backend."

        context = self.retrieve(query)
        print(f"DEBUG: Context length: {len(context)}")

        # Construct history string
        history_string = ""
        if history:
            history_string = "Previous Conversation:\n" + "\n".join(
                [f"User: {h['question']}\nAssistant: {h['answer']}" for h in history]
            ) + "\n\n"

        prompt = f"""
You are an **Elite SEO Expert System**. Your sole purpose is to provide highly precise, technically accurate, and brief SEO answers.

**YOUR PRIMARY INSTRUCTIONS (STRICTLY ENFORCE ALL):**
1.  **RESPONSE FILTER (CRITICAL):** First, analyze the user's USER QUERY.
    * **IF** the query is a simple greeting (e.g., "Hello," "Hi," "Hey there") and contains NO factual question: Your **entire** response must be: "Hello! How may I assist you with your SEO questions today?"
    * **IF** the query is some other topic and contains NO SEO related question: Your **entire** response must be: "That query is outside the scope of my SEO expertise."
    * **IF** the query contains a factual question: Proceed to rule 2.
2.  **ANSWER GENERATION & CONCISION (CRITICAL):** Provide **only** the requested factual answer. **DO NOT** include any introductory phrases, closing remarks, analysis summaries, greetings, or conversational filler. Begin the output directly with the factual information, using technical SEO terminology.
3.  **DOMAIN FOCUS:** If the user query, at any point, deviates from the SEO domain, your immediate response must be: "That query is outside the scope of my SEO expertise."
4.  **STRICT CONTEXTUALITY (Internal Rule):** Your answer **MUST** be based exclusively on the knowledge provided below. DO NOT mention this rule to the user.

**KNOWLEDGE HISTORY:**
{history_string}

**USER QUERY:**
{query}

**RELEVANT KNOWLEDGE (The only source of truth):**
{context}

**FALLBACK RULE (STRICT):**
If the answer cannot be confidently derived from the 'RELEVANT KNOWLEDGE' alone, your *entire* response is:
The provided documents do not contain the required SEO information to answer this question precisely.
"""

        try:
            resp = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500
            )
            return resp.choices[0].message.content
        except Exception as e:
            print(f"DEBUG: Generation error: {e}")
            return f"Error generating answer: {str(e)}"

    def generate_lead_score(self, audit_data: dict) -> dict:
        """Generate lead score (0-100) where HIGH score means BAD SEO (High Potential)."""
        if not self.groq_client:
            return {"score": 0, "justification": "LLM not configured"}
            
        prompt = f"""
        You are a Lead Scoring Agent for an SEO Agency.
        Analyze this website's SEO audit data to determine if they are a good potential client.
        
        SCORING RULES:
        - 0-30: Good SEO (Low potential client - they don't need us)
        - 31-70: Mixed SEO (Medium potential)
        - 71-100: Bad/Missing SEO (High potential client - urgent need for our services)
        
        AUDIT DATA:
        {audit_data}
        
        Return ONLY JSON: {{ "score": <int>, "justification": "<brief string>" }}
        """

        try:
            resp = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                response_format={"type": "json_object"}
            )
            content = resp.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            print(f"DEBUG: Scoring error: {e}")
            return {"score": 0, "justification": f"Error: {str(e)}"}

# Global instance
rag_service = RagService()
