"""Extract source text and reviewable OCR of the fragrance pyramids. No DB writes."""
import concurrent.futures
import glob
import json
import re
import subprocess
from pathlib import Path

import fitz

fitz.TOOLS.mupdf_display_errors(False)
fitz.TOOLS.mupdf_display_warnings(False)
output = Path('/workspace/tiarra-preparation/notes')
output.mkdir(exist_ok=True)
jobs = []
seen = set()
for part in range(1, 5):
    filename = glob.glob(f'/workspace/attachments/*/Парфюмни_нотки_част_{part}_*.pdf')[0]
    document = fitz.open(filename)
    for page in document:
        text = page.get_text()
        match = re.search(r'№\s*(\d+)', text)
        if not match:
            continue
        code = match[1].zfill(3)
        if code in seen:
            continue
        seen.add(code)
        width, height = page.rect.width, page.rect.height
        image = output / f'{code}.png'
        page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=fitz.Rect(width*.52, height*.08, width*.95, height*.6)).save(image)
        jobs.append((code, str(image), text))

def recognize(job):
    code, image, text = job
    result = subprocess.run(['tesseract', image, 'stdout', '--psm', '6'], capture_output=True, text=True, check=True)
    return {'code': code, 'sourceText': text, 'ocr': result.stdout}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(recognize, jobs))
(output / 'extracted.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
print(f'Extracted {len(results)} pages for review.')
