import os
import time
import requests
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 1. Load Secrets
load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

# 2. Configure Client (The New Way)
# We initialize a single client object that handles everything
client = genai.Client(api_key=api_key)

def analyze_video(video_url, expected_code):
    """
    Downloads video from Supabase -> Sends to Gemini -> Returns JSON Verdict
    """
    print(f"Downloading video from: {video_url}...")
    temp_filename = f"temp_{int(time.time())}.mp4"
    
    try:
        # A. Download video
        with requests.get(video_url, stream=True) as r:
            r.raise_for_status()
            with open(temp_filename, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        
        print("Uploading to Gemini...")
        
        # B. Upload to Gemini (New SDK Syntax)
        # client.files.upload returns a file object we can pass directly to the model
        video_file = client.files.upload(file=temp_filename)
        
        # C. Wait for Processing
        # The new SDK simplifies this, but we still check state for safety
        while video_file.state == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(2)
            video_file = client.files.get(name=video_file.name)

        if video_file.state == "FAILED":
            raise ValueError("Gemini failed to process video file.")

        print("\nAI Analyzing with Gemini 2.5 Flash...")

        # D. The Model & Prompt
        # We use the new standard model 'gemini-2.0-flash'
        prompt = f"""
        ### SYSTEM ROLE:
        You are a Senior Risk Auditor for a Tier-1 NBFC. Your job is to approve or reject a 'Packing Credit' loan disbursement based on a video inspection. 
        You are STRICT, SUSPICIOUS, and DETAIL-ORIENTED. Zero tolerance for fraud.

        ### INPUT DATA:
        - Verification Type: Pre-Shipment Packing Credit Inspection
        - Expected Liveness Code: "{expected_code}"

        ### INSTRUCTIONS:

        **STEP 1: AUDIO LIVENESS & SECURITY CHECK (CRITICAL)**
        - Listen to the user's voice. They MUST speak the code "{expected_code}".
        - **Strict Matching:** If the expected code is "9435" and they say "9430", FAIL the inspection immediately.
        - **Anti-Spoofing:** Listen for robotic voices, text-to-speech, or background echoes that suggest re-recording.
        

        **STEP 2: STOCK & INVENTORY VERIFICATION (The Collateral)**
        - "Packing Credit" implies goods ready for shipment.
        - **Scan the Room:** Do not just look for "boxes". Look for *commercial inventory*.
            - Are there pallets? 
            - Is there industrial racking? 
            - Are the goods shrink-wrapped or sealed?
        - **Quantity Check:** Is this a legitimate warehouse/storage volume, or just a few sample boxes in an office corner? (We need VOLUME).

        **STEP 3: FRAUD INDICATORS**
        - Look for computer screens displaying the code (the user should be reading from memory or a sticky note, not a screen recording).
        - Check for "Staged Environments" (e.g., empty cardboard boxes that look too light).

        ### OUTPUT FORMAT:
        Return a valid JSON object ONLY. Do not include markdown formatting or explanations outside the JSON.

        {{
        "verification_status": "APPROVED" | "REJECTED" | "MANUAL_REVIEW",
        "liveness_check": {{
            "code_spoken_correctly": boolean,
            "detected_code_transcript": "string",
            "voice_liveness_confidence": "HIGH" | "LOW"
        }},
        "stock_assessment": {{
            "is_warehouse_environment": boolean,
            "inventory_visible": boolean,
            "inventory_description": "Brief description (e.g., 'Stacked electronics boxes on pallets')",
            "commercial_volume_detected": boolean
        }},
        "risk_assessment": {{
            "fraud_flags_detected": ["List specific risks, e.g., 'User reading from screen', 'Low light'"],
            "overall_confidence_score": 0-100
        }},
        "auditor_reasoning": "One sentence summary of why you approved/rejected."
        }}
        """
        
        # E. Generate Content (New Syntax)
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_uri(
                                file_uri=video_file.uri,
                                mime_type=video_file.mime_type
                            ),
                            types.Part.from_text(text=prompt)
                        ]
                    )
                ]
            )
            
            print(f"AI Response Received: {response.text[:50]}...") 
            
            # Clean up JSON
            clean_json = response.text.replace("```json", "").replace("```", "").strip()
            
            # Cleanup Local File
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
                
            return clean_json

        except Exception as e:
            print(f"CRITICAL AI ERROR during generation: {e}")
            return {"error": f"AI Generation Failed: {str(e)}"}

    except Exception as e:
        # Cleanup even if error
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        print(f"General Error: {e}")
        return {"error": str(e)}

# QUICK TESTER 
if __name__ == "__main__":
    print("Testing Gemini Connection...")
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents='Reply "Gemini 2.5 is Alive" if you hear me.'
        )
        print(response.text)
    except Exception as e:
        print(f"Test Failed: {e}")