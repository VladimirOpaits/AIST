from services.parser import parse_pdf
import os

file_path = "~/AIST/romeo-and-juliet_PDF_FolgerShakespeare.pdf"
file_path = os.path.expanduser(file_path)

text = parse_pdf(file_path)
print(text[:500])