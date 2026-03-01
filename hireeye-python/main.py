import os
import json
import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables (.env)
load_dotenv()

app = FastAPI()

# Allow React to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the official Gemini Client
client = genai.Client()

# The Personality & Rules for the AI
SYSTEM_INSTRUCTION = """
You are the HireEye Principal Engineer AI. You are conducting a live, 5-minute technical interview for a software engineering candidate.
CRITICAL RULES:
1. You are speaking out loud. DO NOT use markdown, asterisks, code blocks, or bullet points. 
2. Keep your responses EXTREMELY short. 1 or 2 sentences maximum.
3. Act like a friendly but sharp senior developer. 
4. Ask exactly one technical question at a time and wait for their answer.
"""

@app.websocket("/ws/interview")
async def interview_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🟢 Candidate Connected to AI Engine")
    
    # 1. Create a persistent Chat Session for this specific interview
    chat = client.chats.create(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.7,
        )
    )
    
    try:
        # 2. Trigger the AI to speak first
        print("Generating initial greeting...")
        initial_response = chat.send_message("The candidate has just connected. Please introduce yourself briefly and ask them what tech stack they are most comfortable with.")
        
        await websocket.send_json({
            "type": "text", 
            "message": initial_response.text
        })
        
        # 3. The Live Interview Loop
        while True:
            # Wait for data from React
            raw_data = await websocket.receive_text()
            payload = json.loads(raw_data)
            
            # Handle Text Input (Fallback/Testing)
            if payload['type'] == 'text':
                print(f"Candidate says: {payload['data']}")
                response = chat.send_message(payload['data'])
                
                await websocket.send_json({
                    "type": "text", 
                    "message": response.text
                })
                
            # Handle Live Audio Input
            elif payload['type'] == 'audio':
                print("🎤 Received audio chunk from candidate. Processing...")
                
                # Decode the base64 audio coming from the browser
                audio_bytes = base64.b64decode(payload['data'])
                
                # Package it into a format Gemini natively understands
                audio_part = types.Part.from_bytes(
                    data=audio_bytes,
                    mime_type='audio/webm' # This is the standard format for browser microphones
                )
                
                # Send the raw audio to the AI (Gemini 2.5 natively understands audio!)
                response = chat.send_message(audio_part)
                
                # Send the AI's verbal response back to React
                await websocket.send_json({
                    "type": "text", 
                    "message": response.text
                })
                
    except WebSocketDisconnect:
        print("🔴 Candidate Disconnected")