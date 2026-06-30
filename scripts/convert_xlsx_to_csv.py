import csv
import datetime
import sys
from pathlib import Path

import openpyxl


def cell_value(value):
    if isinstance(value, datetime.datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, datetime.date):
        return value.isoformat()
    if value is None:
        return ""
    return value


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/convert_xlsx_to_csv.py <source.xlsx> <output.csv>")

    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)

    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    worksheet = workbook.active

    rows = 0
    width = None
    with output.open("w", newline="", encoding="utf-8-sig") as csv_file:
        writer = csv.writer(csv_file)
        for row in worksheet.iter_rows(values_only=True):
            values = [cell_value(value) for value in row]
            if width is None:
                width = len(values)
            if width:
                values = (values + [""] * width)[:width]
            if any(str(value).strip() for value in values):
                writer.writerow(values)
                rows += 1

    print(f"{output.resolve()} {rows} rows")


if __name__ == "__main__":
    main()
