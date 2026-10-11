import os
import sys
import zipfile

OUTPUT_ZIP = "/app/applet/dist-delivery/parkeazy-ph06-monorepo.zip"
OUTPUT_ZIP_ALT = "/app/applet/dist-delivery/parkeazy-ph05-monorepo.zip"
ROOT_DIR = "/app/applet"

EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "dist-delivery",
    ".turbo",
    ".vite",
    ".cache",
    "coverage",
    ".pytest_cache",
    "__pycache__"
}

EXCLUDE_FILES = {
    ".DS_Store",
    "thumbs.db"
}

def create_monorepo_zip():
    os.makedirs(os.path.dirname(OUTPUT_ZIP), exist_ok=True)
    if os.path.exists(OUTPUT_ZIP):
        os.remove(OUTPUT_ZIP)

    file_count = 0
    total_uncompressed_bytes = 0

    print(f"Creating monorepo delivery ZIP at: {OUTPUT_ZIP}")
    with zipfile.ZipFile(OUTPUT_ZIP, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for root, dirs, files in os.walk(ROOT_DIR):
            # filter excluded dirs in place
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.git')]

            for file in files:
                if file in EXCLUDE_FILES or file.endswith('.pyc'):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ROOT_DIR)
                
                # Check that archive path starts at monorepo root
                arcname = os.path.join("parkeazy-monorepo", rel_path)
                zipf.write(full_path, arcname)
                file_count += 1
                total_uncompressed_bytes += os.path.getsize(full_path)

    zip_size_bytes = os.path.getsize(OUTPUT_ZIP)
    zip_size_mb = zip_size_bytes / (1024 * 1024)
    import shutil
    shutil.copyfile(OUTPUT_ZIP, OUTPUT_ZIP_ALT)
    print(f"✅ Successfully created: {OUTPUT_ZIP}")
    print(f"   Files packaged: {file_count}")
    print(f"   Uncompressed:   {total_uncompressed_bytes / (1024 * 1024):.2f} MB")
    print(f"   ZIP size:       {zip_size_mb:.2f} MB")

if __name__ == "__main__":
    create_monorepo_zip()
