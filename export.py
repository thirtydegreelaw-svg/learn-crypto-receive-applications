
import os
import zipfile

# Original website folder
PROJECT_FOLDER = os.path.dirname(os.path.abspath(__file__))

# Export destination
EXPORT_FOLDER = r"E:\CryptoAcademy_Export"

ZIP_NAME = "CryptoAcademy.zip"

os.makedirs(EXPORT_FOLDER, exist_ok=True)

ZIP_PATH = os.path.join(EXPORT_FOLDER, ZIP_NAME)

EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    ".vscode",
    "__pycache__"
}

print("CryptoAcademy Export Started...")

with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zipf:

    for root, dirs, files in os.walk(PROJECT_FOLDER):

        dirs[:] = [
            d for d in dirs
            if d not in EXCLUDE_DIRS
        ]

        for file in files:

            if file in (ZIP_NAME, "export.py"):
                continue

            if file.endswith((".pyc", ".log")):
                continue

            full_path = os.path.join(root, file)

            relative_path = os.path.relpath(
                full_path, PROJECT_FOLDER
            )

            zipf.write(full_path, relative_path)

            print("Added:", relative_path)

print("\nSUCCESS!")
print("ZIP Location:", ZIP_PATH)
