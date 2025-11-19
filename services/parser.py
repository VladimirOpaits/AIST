import cv2
import numpy as np
from pdf2image import convert_from_path
import pytesseract
import pdfplumber
import requests
import torch
from ultralytics import YOLO

def latex_ocr_remote(image):
    _, png = cv2.imencode(".png", image)
    resp = requests.post(
        "http://localhost:8502/predict",
        files={"file": ("image.png", png.tobytes(), "image/png")}
    )
    print("CALLING PIX2TEX NOW!")

    return resp.text.strip()

model_file = "yolov8s-doclaynet.pt" if torch.cuda.is_available() else "yolov8n-doclaynet.pt"
yolo_model = YOLO(model_file)

def detect_layout(image, confidence_threshold=0.5):
    results = yolo_model(image)
    blocks = []
    
    for det in results[0].boxes.data.tolist():
        x1, y1, x2, y2, score, class_id = det
        
        if score < confidence_threshold:
            continue
            
        blocks.append({
            "x1": int(x1),
            "y1": int(y1),
            "x2": int(x2),
            "y2": int(y2),
            "label": yolo_model.names[int(class_id)],
            "score": float(score)  
        })
    
    blocks.sort(key=lambda x: x["y1"])
    return blocks

def is_likely_formula_region(crop_image):
    try:
        gray = cv2.cvtColor(crop_image, cv2.COLOR_BGR2GRAY)
        
        text = pytesseract.image_to_string(gray, config='--psm 6')
        
        formula_indicators = ['=', '∑', '∫', '∂', '√', '^', '_', '\\frac', '{', '}']
        indicator_count = sum(1 for char in text if char in formula_indicators)
        
        return indicator_count >= 2
    except Exception as e:
        print(f"Formula detection error: {e}")
        return False

def visualize_detection(image, blocks, output_path="debug_detection.png"):
    vis_image = image.copy()
    for block in blocks:
        x1, y1, x2, y2 = block["x1"], block["y1"], block["x2"], block["y2"]
        label = block["label"]
        score = block.get("score", 0)
        
        if "formula" in label.lower():
            color = (0, 255, 0)  
        elif "table" in label.lower():
            color = (255, 0, 0)  
        else:
            color = (0, 0, 255)  
            
        cv2.rectangle(vis_image, (x1, y1), (x2, y2), color, 2)
        label_text = f"{label} ({score:.2f})"
        cv2.putText(vis_image, label_text, (x1, y1-10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    
    cv2.imwrite(output_path, vis_image)
    print(f"Debug visualization saved to {output_path}")

def parse_pdf(path, confidence_threshold=0.5, debug=False):
    page_images = convert_from_path(path)
    results = []

    with pdfplumber.open(path):
        for page_num, pil_img in enumerate(page_images):
            print(f"Processing page {page_num + 1}")
            
            cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            layout_blocks = detect_layout(cv_img, confidence_threshold)
            
            if debug:
                visualize_detection(cv_img, layout_blocks, f"page_{page_num+1}_detection.png")

            page_text = []
            for i, block in enumerate(layout_blocks):
                x1, y1, x2, y2 = block["x1"], block["y1"], block["x2"], block["y2"]
                crop = cv_img[y1:y2, x1:x2]
                
                print(f"Block {i+1}: {block['label']} (score: {block.get('score', 0):.2f})")

                if block["label"] in ("text", "title"):
                    text = pytesseract.image_to_string(crop, lang="eng")
                    page_text.append(text)
                elif block["label"] == "table":
                    table_text = pytesseract.image_to_string(crop, lang="eng")
                    page_text.append("\nTABLE:\n" + table_text)
                elif (block["label"].lower() in ("formula", "formulas", "math", "equation") or 
                      is_likely_formula_region(crop)):
                    try:
                        latex = latex_ocr_remote(crop)
                        page_text.append(f"\n$$\n{latex}\n$$\n")
                    except Exception as e:
                        print(f"LaTeX OCR failed: {e}")
                        fallback = pytesseract.image_to_string(crop, lang="eng")
                        page_text.append(f"FORMULA FALLBACK: {fallback}")
                else:
                    fallback = pytesseract.image_to_string(crop, lang="eng")
                    page_text.append(f"UNKNOWN BLOCK: {fallback}")

            results.append("\n".join(page_text))

    return "\n\n".join(results)
