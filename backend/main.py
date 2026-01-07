from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import math
import uuid
from fastapi.middleware.cors import CORSMiddleware
from ai_engine import analyze_video
import json
import random
from report_generator import generate_pdf


# 1. Load Secrets
load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
target_lat =19.073892
target_long =72.845470
max_distance =500

# 2. Connect to Supabase
supabase: Client = create_client(url, key)

# 3. Start App
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows ALL frontend to connect
    allow_credentials=True,
    allow_methods=["*"],  # Allows all types of messages (POST, GET, etc.)
    allow_headers=["*"],
)

# --- HELPER: Calculate Distance (Haversine Formula) ---
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# --- DATA MODELS ---
class LocationCheck(BaseModel):
    lat: float
    long: float
    case_id: str

# --- API ENDPOINTS ---

@app.get("/")
def home():
    return {"message": "VerifAI API is Online"}

@app.post("/initiate-session")
def initiate_session(data: LocationCheck):
    """
    Step 1: Check if User is at the Warehouse.
    If YES -> Create a session in DB.
    If NO -> deny access.
    """
    dist = calculate_distance(data.lat, data.long, target_lat, target_long)
    print(f"User is {dist:.2f} meters away.")

    if dist > max_distance:
        # Strict Security: Block them if they are too far
        return {"allowed": False, "reason": "You are too far from the location!"}
    
    # liveness verification random code 
    otp_code = str(random.randint(1000, 9999)) # Generate "4582"
    
    try:
        # Check if session already exists to avoid duplicates (Optional safety)
        existing = supabase.table("inspections").select("*").eq("case_id", data.case_id).execute()
        
        if existing.data:
            # Update existing session with new code
            supabase.table("inspections").update({
                "gps_lat": data.lat,
                "gps_long": data.long,
                "status": "pending",
                "verification_code": otp_code
            }).eq("case_id", data.case_id).execute()
        else:
            # Insert new session
            supabase.table("inspections").insert({
                "case_id": data.case_id,
                "gps_lat": data.lat,
                "gps_long": data.long,
                "status": "pending",
                "verification_code": otp_code
            }).execute()
        
        return {
            "allowed": True, 
            "session_id": data.case_id, 
            "verification_code": otp_code # <--- Critical: Send to Frontend
        }
    except Exception as e:
        print(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail="Database Error")



        
@app.post("/upload-video/{session_id}")
async def upload_video(session_id: str, file: UploadFile = File(...)):
    """
    Step 2: Upload Video -> Fetch OTP -> Run AI Analysis -> Generate PDF
    """
    try:
        # --- A. Upload to Supabase Storage ---
        file_content = await file.read()
        file_ext = file.filename.split(".")[-1]
        file_name = f"{session_id}_{uuid.uuid4()}.{file_ext}"

        # Upload Video
        supabase.storage.from_("Videos").upload(
            path=file_name,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Get Public URL
        public_url = supabase.storage.from_("Videos").get_public_url(file_name)
        print(f"Video Uploaded: {public_url}")

        # --- B. UPDATE DB: Status -> "processing" ---
        supabase.table("inspections").update({
            "video_url": public_url,
            "status": "processing"
        }).eq("case_id", session_id).execute()

        # --- C. FETCH VERIFICATION CODE ---
        session_data = supabase.table("inspections").select("*").eq("case_id", session_id).execute()
        
        if not session_data.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        expected_code = session_data.data[0].get("verification_code", "0000")

        # --- D. TRIGGER AI ANALYSIS ---
        print(f"AI Verifying Liveness (Expected Code: {expected_code})...")
        
        ai_result_json_str = analyze_video(public_url, expected_code)
        
        # Parse JSON safely
        try:
            ai_data = json.loads(ai_result_json_str)
        except:
            ai_data = {"raw": ai_result_json_str}

        # --- E. SAVE VERDICT TO DB ---
        supabase.table("inspections").update({
            "status": "completed",
            "ai_result": ai_data
        }).eq("case_id", session_id).execute()

        # --- F. GENERATE & UPLOAD PDF REPORT (MOVED UP!) ---
        report_url = None
        try:
            print("Generating PDF Report...")
            # 1. Generate PDF locally
            pdf_filename = generate_pdf(session_id, ai_data)
            
            # 2. Upload PDF to Supabase Storage
            # IMPORTANT: Ensure you created a bucket named "Reports" in Supabase!
            with open(pdf_filename, "rb") as f:
                supabase.storage.from_("Reports").upload(
                    path=pdf_filename,
                    file=f,
                    file_options={"content-type": "application/pdf"}
                )
            
            # 3. Get Public URL for PDF
            report_url = supabase.storage.from_("Reports").get_public_url(pdf_filename)
            
            # 4. Save PDF URL to Database
            supabase.table("inspections").update({
                "report_url": report_url
            }).eq("case_id", session_id).execute()
            
            # Cleanup local file
            if os.path.exists(pdf_filename):
                os.remove(pdf_filename)
            
            print(f"Report Generated: {report_url}")

        except Exception as e:
            print(f"WARNING: Report Generation Failed: {e}")
            # We don't stop the whole process if PDF fails, just log it.

        # --- G. RETURN FINAL RESPONSE ---
        return {
            "status": "success", 
            "video_url": public_url, 
            "ai_verdict": ai_data,
            "report_url": report_url  # Now the frontend gets the PDF link!
        }

    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))