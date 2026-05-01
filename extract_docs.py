import os
import fitz  # PyMuPDF
from bs4 import BeautifulSoup
import re

def extract_pdf(filepath):
    text = ""
    try:
        doc = fitz.open(filepath)
        for page in doc:
            text += page.get_text() + "\n"
        print(f"Successfully extracted {filepath} ({len(text)} chars)")
        with open("pdf_extracted.txt", "w", encoding="utf-8") as f:
            f.write(text)
    except Exception as e:
        print(f"Error extracting PDF: {e}")

def extract_html(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            soup = BeautifulSoup(f, 'html.parser')
            text = soup.get_text(separator=' ', strip=True)
        print(f"Successfully extracted {filepath} ({len(text)} chars)")
        with open("html_extracted.txt", "w", encoding="utf-8") as f:
            f.write(text)
    except Exception as e:
        print(f"Error extracting HTML: {e}")

def extract_doc(filepath):
    # Try win32com first
    try:
        import win32com.client
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(filepath))
        text = doc.Content.Text
        doc.Close()
        word.Quit()
        print(f"Successfully extracted {filepath} using win32com ({len(text)} chars)")
        with open("doc_extracted.txt", "w", encoding="utf-8") as f:
            f.write(text)
        return
    except Exception as e:
        print(f"win32com failed: {e}")

    # Fallback to string extraction (crude but usually gets the English text)
    try:
        with open(filepath, "rb") as f:
            content = f.read()
        # Find sequences of printable ASCII characters
        import string
        printable = string.printable.encode('ascii')
        
        words = []
        current_word = bytearray()
        for byte in content:
            if byte in printable:
                current_word.append(byte)
            else:
                if len(current_word) > 4:
                    words.append(current_word.decode('ascii', errors='ignore'))
                current_word = bytearray()
        
        text = " ".join(words)
        # remove excess whitespace
        text = re.sub(r'\s+', ' ', text)
        print(f"Successfully extracted {filepath} using fallback string extraction ({len(text)} chars)")
        with open("doc_extracted.txt", "w", encoding="utf-8") as f:
            f.write(text)
    except Exception as e:
        print(f"Error extracting DOC: {e}")

if __name__ == "__main__":
    extract_pdf("RS-Phase 1 Detectra-1 (1).pdf")
    extract_html("Detectra_AI_Implementation_Blueprint.html")
    extract_doc("detectra SDS-Phase 2 Template_All Projects S16 onwards Projects 20160502.doc")
