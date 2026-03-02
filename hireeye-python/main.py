import os
import json
import base64
import io
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import AsyncGroq

# Load environment variables
load_dotenv()

app = FastAPI()

# Permissive CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))

# --- Helper: Database Fetcher ---
async def get_job_context(candidate_id: str):
    """Fetches real Job Protocol from Node.js."""
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(f"http://localhost:5000/api/candidates/{candidate_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict):
                    job = data.get("jobId", {})
                    if isinstance(job, dict):
                        return job.get("title"), job.get("description")
    except Exception as e:
        print(f"❌ Error fetching job context: {e}")
    return "Software Engineer", "General Technical Interview"

# --- WebSocket Engine ---
@app.websocket("/ws/interview-v2/{candidate_id}")
async def interview_endpoint(websocket: WebSocket, candidate_id: str):
    await websocket.accept()
    print(f"🟢 Candidate {candidate_id} connected.")
    
    # 1. State Tracking
    state = {
        "count": 0,
        "max": 8,
        "difficulty": 1, 
        "strikes": 0
    }

    job_title, job_desc = await get_job_context(candidate_id)
    print(f"✅ Protocol Locked: {job_title}")

    def get_prompt():
        return f"""
        You are the HireEye Studio Principal Engineer AI. 
        ROLE: {job_title}. REQUIREMENTS: {job_desc}.
        CURRENT LEVEL: {state['difficulty']}/3.
        
        CRITICAL RULES:
        1. NEVER mention "Levels", "Attempts", "Strikes", or internal logic to the candidate.
        2. Do NOT repeat questions. Always move to a NEW topic.
        3. If they answer incorrectly, briefly acknowledge it and ask a DIFFERENT question immediately.
        4. When ending, say exactly: "Thank you for your time. This concludes our assessment. FINISH_INTERVIEW"
        5. Keep responses short (1-2 sentences max).
        """

    conversation_history = [{"role": "system", "content": get_prompt()}]

    try:
        # Initial Greeting
        state["count"] += 1
        intro_prompt = f"Greet the candidate for {job_title}. Ask one Level 1 (EASY) technical question based on: {job_desc}."
        
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant", 
            messages=conversation_history + [{"role": "user", "content": intro_prompt}],
            temperature=0.7
        )
        ai_msg = response.choices[0].message.content
        conversation_history.append({"role": "assistant", "content": ai_msg})
        await websocket.send_json({"type": "text", "message": ai_msg})

        # 2. Main Listening Loop
        while True:
            try:
                raw_data = await websocket.receive_text()
                payload = json.loads(raw_data)
                
                if payload.get('type') == 'audio':
                    print(f"🎤 Question {state['count']}/{state['max']} | Level: {state['difficulty']}")
                    
                    audio_bytes = base64.b64decode(payload['data'])
                    if len(audio_bytes) < 500:
                        await websocket.send_json({"type": "text", "message": "I didn't quite catch that. Could you repeat?"})
                        continue

                    # --- TRANSCRIPTION ---
                    file_tuple = ("audio.webm", io.BytesIO(audio_bytes), "audio/webm")
                    transcription = await client.audio.transcriptions.create(
                        file=file_tuple,
                        model="whisper-large-v3",
                        prompt=f"Tech interview for {job_title}: {job_desc}. Phrases: 'I don't know', 'Can you repeat'.",
                        response_format="json"
                    )
                    
                    user_text = transcription.text.strip()
                    if not user_text:
                        await websocket.send_json({"type": "text", "message": "I didn't hear anything. Please try again."})
                        continue

                    # Send transcription to UI so candidate sees what was heard
                    await websocket.send_json({"type": "transcription", "message": user_text})

                    # --- ADAPTIVE EVALUATION ---
                    eval_prompt = f"Candidate: '{user_text}'. Is this a technically relevant answer for {job_title}? Reply ONLY with 'PASS' or 'FAIL'."
                    check = await client.chat.completions.create(
                        model="llama-3.1-8b-instant",
                        messages=[{"role": "user", "content": eval_prompt}],
                        max_tokens=5,
                        temperature=0
                    )
                    result = check.choices[0].message.content.strip().upper()
                    print(f"⚖️ Evaluation: {result}")

                    # --- UPDATE STATE ---
                    state["count"] += 1 
                    if "PASS" in result:
                        state["difficulty"] = min(3, state["difficulty"] + 1)
                        state["strikes"] = 0
                        print(f"✅ PASS: Moving to Level {state['difficulty']}")
                    else:
                        state["strikes"] += 1
                        state["difficulty"] = max(1, state["difficulty"] - 1)
                        print(f"❌ FAIL: Strike {state['strikes']}")

                    # Append user text to memory BEFORE termination check
                    conversation_history.append({"role": "user", "content": user_text})

                    # --- CHECK TERMINATION ---
                    if state["strikes"] >= 3 or state["count"] >= state["max"]:
                        print("🏁 ENDING SESSION")
                        
                        # ✨ THE FIX: We use a brand new, isolated prompt 
                        # so the AI doesn't see the "Always ask a question" rule anymore.
                        goodbye_prompt = [
                            {
                                "role": "system", 
                                "content": f"The interview for the {job_title} role is now complete. Say a brief, polite, 1-sentence goodbye to the candidate. DO NOT ask any questions. You MUST end your response with exactly: FINISH_INTERVIEW"
                            }
                        ]
                        
                        final_resp = await client.chat.completions.create(
                            model="llama-3.1-8b-instant",
                            messages=goodbye_prompt,
                            temperature=0.2 # Lower temp means it strictly follows rules
                        )
                        
                        final_msg = final_resp.choices[0].message.content
                        await websocket.send_json({"type": "text", "message": final_msg})
                        
                        # ✨ THE FIX: Wait 1 second before slamming the connection shut
                        # This ensures the browser fully receives the FINISH_INTERVIEW keyword
                        import asyncio
                        await asyncio.sleep(1) 
                        
                        break # Exits loop cleanly

                    # --- GENERATE NEXT QUESTION ---
                    next_prompt = f"Evaluation: {result}. Move to a NEW technical topic at Difficulty Level {state['difficulty']}. Do NOT repeat previous questions."
                    conversation_history[0]["content"] = get_prompt() 

                    next_q_resp = await client.chat.completions.create(
                        model="llama-3.1-8b-instant",
                        messages=conversation_history + [{"role": "system", "content": next_prompt}],
                        temperature=0.8
                    )
                    ai_reply = next_q_resp.choices[0].message.content
                    
                    # CRITICAL FIX: Save AI's response to memory so it doesn't repeat!
                    conversation_history.append({"role": "assistant", "content": ai_reply})
                    
                    # This tells React to unlock the mic
                    await websocket.send_json({"type": "text", "message": ai_reply})

            except WebSocketDisconnect:
                print("🔴 Candidate Disconnected.")
                break
            except Exception as e:
                print(f"⚠️ Loop Error: {e}")
                # Send text to unlock the React UI in case of a crash
                await websocket.send_json({"type": "text", "message": "Sorry, I had a brief connection issue. Could you repeat?"})
                continue

    except Exception as e:
        print(f"❌ Critical Error: {e}")
    finally:
        print("🔌 Connection Closed.")