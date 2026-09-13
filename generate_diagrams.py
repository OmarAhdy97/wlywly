# -*- coding: utf-8 -*-
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from PIL import Image, ImageDraw, ImageFont

# -------------------------------------------------------------
# 1. Create Diagram Images using PIL
# -------------------------------------------------------------
os.makedirs("doc_assets", exist_ok=True)

def create_architecture_diagram():
    w, h = 1200, 520
    img = Image.new("RGB", (w, h), color="#0F172A")
    draw = ImageDraw.Draw(img)
    
    # Outer Border
    draw.rectangle([10, 10, w - 10, h - 10], outline="#D97706", width=3)
    
    # Try load fonts
    try:
        title_font = ImageFont.truetype("arial.ttf", 34)
        box_title_font = ImageFont.truetype("segoeui.ttf", 22)
        box_text_font = ImageFont.truetype("segoeui.ttf", 16)
    except:
        title_font = box_title_font = box_text_font = ImageFont.load_default()
        
    # Title
    draw.text((w//2 - 260, 30), "SYSTEM ARCHITECTURE & INTEGRATIONS", fill="#F59E0B", font=title_font)
    
    # Central Core: Web App
    draw.rounded_rectangle([420, 160, 780, 360], radius=15, fill="#1E293B", outline="#F59E0B", width=3)
    draw.text((470, 185), "Agenda Core Web App", fill="#FFFFFF", font=box_title_font)
    draw.text((460, 225), "- React 18 + Vite SPA", fill="#CBD5E1", font=box_text_font)
    draw.text((460, 255), "- Realtime Data State", fill="#CBD5E1", font=box_text_font)
    draw.text((460, 285), "- Multi-Role Workspaces", fill="#CBD5E1", font=box_text_font)
    draw.text((460, 315), "- Offline Local Cache", fill="#CBD5E1", font=box_text_font)
    
    # Node 1: Supabase Cloud Database (Left)
    draw.rounded_rectangle([40, 160, 340, 360], radius=15, fill="#1E293B", outline="#10B981", width=2)
    draw.text((70, 185), "Supabase Cloud DB", fill="#10B981", font=box_title_font)
    draw.text((60, 225), "- PostgreSQL + RLS", fill="#CBD5E1", font=box_text_font)
    draw.text((60, 255), "- Auth & Google OAuth", fill="#CBD5E1", font=box_text_font)
    draw.text((60, 285), "- Realtime Data Sync", fill="#CBD5E1", font=box_text_font)
    draw.text((60, 315), "- Encrypted Tables", fill="#CBD5E1", font=box_text_font)
    
    # Node 2: Telegram Bot Integration (Right Top)
    draw.rounded_rectangle([860, 110, 1160, 260], radius=15, fill="#1E293B", outline="#38BDF8", width=2)
    draw.text((890, 125), "Telegram Bot API", fill="#38BDF8", font=box_title_font)
    draw.text((880, 165), "- Auto Session Alerts", fill="#CBD5E1", font=box_text_font)
    draw.text((880, 195), "- Instant Balance & Bills", fill="#CBD5E1", font=box_text_font)
    draw.text((880, 225), "- Deep Link Verification", fill="#CBD5E1", font=box_text_font)
    
    # Node 3: Google Calendar Integration (Right Bottom)
    draw.rounded_rectangle([860, 290, 1160, 440], radius=15, fill="#1E293B", outline="#EA580C", width=2)
    draw.text((880, 305), "Google Calendar Sync", fill="#FB923C", font=box_title_font)
    draw.text((880, 345), "- Sync Court Sessions", fill="#CBD5E1", font=box_text_font)
    draw.text((880, 375), "- Mobile Native Alerts", fill="#CBD5E1", font=box_text_font)
    draw.text((880, 405), "- Two-Way Time Slotting", fill="#CBD5E1", font=box_text_font)
    
    # Connection Lines
    draw.line([(340, 260), (420, 260)], fill="#10B981", width=3)
    draw.line([(780, 230), (860, 185)], fill="#38BDF8", width=3)
    draw.line([(780, 290), (860, 365)], fill="#FB923C", width=3)
    
    # Footer
    draw.text((380, 470), "Comprehensive Legal Office Enterprise Platform", fill="#94A3B8", font=box_text_font)
    
    img.save("doc_assets/architecture.png")

def create_workflow_diagram():
    w, h = 1200, 480
    img = Image.new("RGB", (w, h), color="#0F172A")
    draw = ImageDraw.Draw(img)
    
    draw.rectangle([10, 10, w - 10, h - 10], outline="#10B981", width=3)
    
    try:
        title_font = ImageFont.truetype("arial.ttf", 32)
        box_title_font = ImageFont.truetype("segoeui.ttf", 20)
        box_text_font = ImageFont.truetype("segoeui.ttf", 15)
    except:
        title_font = box_title_font = box_text_font = ImageFont.load_default()
        
    draw.text((w//2 - 250, 30), "LEGAL WORKFLOW & CASE LIFECYCLE", fill="#34D399", font=title_font)
    
    steps = [
        ("1. Filing & Registration", "Client intake, Case file,\nFees estimation, POA"),
        ("2. Bailiff Notification", "Registry handover, Paper tracking,\nService status & alert"),
        ("3. Court Sessions & Roll", "Daily agenda, Judgment/Adjourn,\nAuto next-date calendar"),
        ("4. Financials & Telegram", "Ledger balance, Invoice PDF,\nInstant Telegram update")
    ]
    
    box_w = 240
    box_h = 240
    start_x = 40
    gap = 55
    y = 130
    
    for i, (title, desc) in enumerate(steps):
        x = start_x + i * (box_w + gap)
        draw.rounded_rectangle([x, y, x + box_w, y + box_h], radius=12, fill="#1E293B", outline="#F59E0B" if i%2==0 else "#38BDF8", width=2)
        draw.text((x + 15, y + 25), title, fill="#FFFFFF", font=box_title_font)
        
        lines = desc.split("\n")
        for line_idx, line in enumerate(lines):
            draw.text((x + 15, y + 80 + line_idx * 30), line, fill="#94A3B8", font=box_text_font)
            
        if i < len(steps) - 1:
            arr_x = x + box_w + 10
            arr_y = y + box_h // 2
            draw.polygon([(arr_x, arr_y - 12), (arr_x + 30, arr_y), (arr_x, arr_y + 12)], fill="#10B981")
            
    draw.text((360, 425), "Fully Integrated Digital Practice from Intake to Final Ruling", fill="#CBD5E1", font=box_text_font)
    img.save("doc_assets/workflow.png")

create_architecture_diagram()
create_workflow_diagram()
print("Diagrams generated successfully!")
