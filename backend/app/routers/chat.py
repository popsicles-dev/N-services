from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.rag_service import rag_service

router = APIRouter()

# In-memory session history
# Key: session_id (str), Value: list of dicts
conversation_history = {}

class ChatRequest(BaseModel):
    session_id: str
    message: str

@router.post("/ask")
async def ask_steve(request: ChatRequest):
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Get history for this session
    current_history = conversation_history.get(request.session_id, [])
    
    # Generate answer with history
    answer = rag_service.generate_answer(request.message, history=current_history)
    
    # Update history
    current_history.append({"question": request.message, "answer": answer})
    conversation_history[request.session_id] = current_history
    
    return {"answer": answer}
