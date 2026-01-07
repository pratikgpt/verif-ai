from fpdf import FPDF
import json
import os

class AuditReport(FPDF):
    def header(self):
        # Logo or Title
        self.set_font('Arial', 'B', 16)
        self.cell(0, 10, 'VerifAI - Pre-Shipment Inspection Certificate', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_pdf(session_id, ai_data):
    """
    Converts Gemini JSON analysis into a Professional PDF.
    """
    pdf = AuditReport()
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    # 1. Inspection Details
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, "1. Inspection Summary", 0, 1)
    pdf.set_font("Arial", size=12)
    
    # Handle both Dict and String input safely
    if isinstance(ai_data, str):
        try:
            ai_data = json.loads(ai_data)
        except:
            ai_data = {}

    status = ai_data.get("verification_status", "UNKNOWN")
    color = (0, 128, 0) if status == "APPROVED" else (255, 0, 0) # Green or Red
    
    pdf.set_text_color(*color)
    pdf.cell(0, 10, f"VERDICT: {status}", 0, 1)
    pdf.set_text_color(0, 0, 0) # Reset color
    
    pdf.cell(0, 10, f"Case ID: {session_id}", 0, 1)
    pdf.ln(5)

    # 2. Liveness Check
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, "2. Liveness & Security", 0, 1)
    pdf.set_font("Arial", size=12)
    
    liveness = ai_data.get("liveness_check", {})
    pdf.cell(0, 10, f"Code Spoken Correctly: {liveness.get('code_spoken_correctly', 'N/A')}", 0, 1)
    pdf.cell(0, 10, f"Voice Confidence: {liveness.get('voice_liveness_confidence', 'N/A')}", 0, 1)
    pdf.multi_cell(0, 10, f"Transcript: \"{liveness.get('detected_code_transcript', '')}\"")
    pdf.ln(5)

    # 3. Stock Assessment
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, "3. Stock & Collateral", 0, 1)
    pdf.set_font("Arial", size=12)
    
    stock = ai_data.get("stock_assessment", {})
    pdf.cell(0, 10, f"Warehouse Environment: {'YES' if stock.get('is_warehouse_environment') else 'NO'}", 0, 1)
    pdf.cell(0, 10, f"Commercial Volume: {'YES' if stock.get('commercial_volume_detected') else 'NO'}", 0, 1)
    pdf.multi_cell(0, 10, f"Description: {stock.get('inventory_description', 'No description provided.')}")
    pdf.ln(5)

    # 4. Auditor Reasoning
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, "4. Auditor Reasoning", 0, 1)
    pdf.set_font("Arial", 'I', 11)
    pdf.multi_cell(0, 10, ai_data.get("auditor_reasoning", "No reasoning provided."))
    
    # Save file
    filename = f"report_{session_id}.pdf"
    pdf.output(filename)
    return filename