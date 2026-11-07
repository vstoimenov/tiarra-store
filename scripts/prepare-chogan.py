"""Prepare reviewable hidden catalog drafts from pdftotext -layout price-list output.

Usage: python3 scripts/prepare-chogan.py /path/to/price.txt /path/to/output.json
Does not write to the store database.
"""
import json
import re
import sys
from pathlib import Path

pages = Path(sys.argv[1]).read_text().split('\f')
products = []
for page_index, page in enumerate(pages):
    if page_index not in range(2, 8):
        continue
    gender = {3: 'unisex', 4: 'female', 5: 'female', 6: 'male', 7: 'male'}.get(page_index)
    volumes = [50, 15] if page_index == 2 else [30, 70, 15]
    for line in page.splitlines():
        match = re.match(r'^\s*(?:\(\d+\)\s*)?(\d{3})\s+(.+?)\s+€\s*(\d+[.,]\d{2})(.*)$', line)
        if not match:
            continue
        code, label, first_price, rest = match.groups()
        prices = [first_price] + re.findall(r'€\s*(\d+[.,]\d{2})', rest)
        if len(prices) != len(volumes):
            raise ValueError(f'Ambiguous prices for {code}: {line}')
        name = label.split(' (')[0].strip()
        products.append({
            'sourcePage': page_index + 1,
            'sourceLabel': label,
            'code': code,
            'title': f'OLFazeta by CHOGAN {code} — {name}',
            'slug': f'olfazeta-chogan-{code}',
            'brand': 'OLFazeta by CHOGAN',
            'gender': gender,
            'hidden': True,
            'stock': 0,
            'images': [],
            'notes': None,
            'volumes': [{'ml': volume, 'priceEUR': float(price.replace(',', '.')), 'stock': 0, 'requiresCase': volume == 15} for volume, price in zip(volumes, prices)],
            'reviewRequired': ['Product photo', 'Fragrance notes', 'Confirm incoming assortment'] + (['Gender'] if gender is None else []),
        })
codes = [product['code'] for product in products]
if len(codes) != len(set(codes)):
    raise ValueError('Duplicate fragrance codes')
output = {'status': 'prepared_not_imported', 'source': 'Price_list_BG_2026.pdf', 'products': products,
          'remaining': ['Event fragrances', 'Children fragrances: volume not specified', 'Body creams', 'Shower gels', 'Mythologik collection', 'Fragrance notes PDF', 'Product images']}
Path(sys.argv[2]).write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
print(f'Prepared {len(products)} fragrances, {sum(len(p["volumes"]) for p in products)} volume prices. No database writes.')
