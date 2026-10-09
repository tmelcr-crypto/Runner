"""The police table <-> spreadsheet. Same as: python3 tools/settings_sheet.py police export|import <file> [--dry-run]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from settings_sheet import main, exact_numbers   # noqa: F401  (exact_numbers is used by vehicle_sheet.py)
if __name__ == '__main__': main(['police'] + sys.argv[1:])
