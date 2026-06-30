import zipfile
import xml.etree.ElementTree as ET
import os

xlsx_path = '.abacusai/temp/4558eac7-b1b0-45e8-ae1b-336f47062fe5.xlsx'

try:
    with zipfile.ZipFile(xlsx_path, 'r') as z:
        print("Files in XLSX:", z.namelist()[:30])
        
        workbook_xml = z.read('xl/workbook.xml').decode('utf-8')
        root = ET.fromstring(workbook_xml)
        
        ns = {'wb': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        sheets = root.findall('.//wb:sheet', ns)
        
        print(f"\nSheet names found: {len(sheets)} sheets")
        for sheet in sheets[:15]:
            print(f"  - {sheet.get('name')}")
            
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
