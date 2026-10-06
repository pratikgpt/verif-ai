
import os
import time
import requests
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 1. Load Secrets
load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

# 2. Configure Client
client = genai.Client(api_key=api_key)

# 3. Gemini model used for the audit
MODEL = "gemini-3.8-flash"

def analyze_video(video_url, expected_code, product_name="General Stock"):
    """
    Downloads video from Supabase -> Sends to Gemini -> Returns JSON Verdict
    Now supports DYNAMIC Product Verification (Rice, Electronics, etc.)
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
        
        # B. Upload to Gemini
        video_file = client.files.upload(file=temp_filename)
        
        # C. Wait for Processing
        while video_file.state == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(1)
            video_file = client.files.get(name=video_file.name)

        if video_file.state == "FAILED":
            raise ValueError("Gemini failed to process video file.")

        print(f"\nAI Analyzing '{product_name}' with Gemini...")

        # D. The Dynamic Prompt
        prompt = f"""
        ### SYSTEM ROLE:
        You are a Senior Risk Auditor for physical stock verification. Your job is to verify a shipment of: **{product_name}**.
        
        ### INPUT DATA:
        - Verification Type: Pre-Shipment Packing Credit Inspection
        - Expected Liveness Code: "{expected_code}"
        - Expected Product: "{product_name}"

        ### INSTRUCTIONS:
        **STEP 1: AUDIO LIVENESS**
        - Verify the user speaks the code "{expected_code}".
        - Listen for robotic voices or background echoes.
        - If unclear, mark for manual review. Reject liveness only if no code spoken or wrong code spoken. 

        **STEP 2: PRODUCT VERIFICATION (CRITICAL)**
        - **Visual Confirmation:** Do you see items that look like {product_name}?
        - **Packaging Check:** - If {product_name} is "Rice/Grains", look for gunny bags or sacks.
        - If {product_name} is "Electronics", look for branded cardboard boxes.
        - check there should not be mismatch of products
        - If uncertain, mark for manual review.


        **STEP 3: CONDITION CHECK**
        - Check stock is available at the first priority
        - Inspect for damage, rust, dust, or spoilage briefly.
        - Do NOT infer storage duration or intent.

        ### OUTPUT FORMAT (JSON ONLY):
        {{
            "verification_status": "APPROVED" | "REJECTED" | "MANUAL_REVIEW",
            "liveness_check": {{ "code_spoken_correctly": boolean, "voice_liveness_confidence": "HIGH" | "LOW" }},
            "product_verification": {{
                "matches_expected_product": boolean,
                "visual_description": "string (e.g. 'Saw white grains in open sack')",
                "packaging_type": "string"
            }},
            "stock_assessment": {{
                "commercial_volume_detected": boolean,
                "condition": "Good" | "Damaged" | "Dusty" | "Unclear"
            }},
            "risk_assessment": {{ "fraud_flags_detected": [], "overall_confidence_score": 0-100 }},
            "auditor_reasoning": "string: One sentence summary of why you approved/rejected."
            
        }}
        """

        # E. Generate Content
        try:
            response = client.models.generate_content(
                model=MODEL,
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
            
            # Clean up JSON (Remove markdown backticks if present)
            clean_json = response.text.replace("```json", "").replace("```", "").strip()
            
            # Cleanup Local File
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
                
            return clean_json

        except Exception as e:
            print(f"CRITICAL AI ERROR: {e}")
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
        # Simple text test
        response = client.models.generate_content(
            model=MODEL,
            contents='Reply "Gemini is Online" if you hear me.'
        )
        print(response.text)
    except Exception as e:
        print(f"Test Failed: {e}")