#!/usr/bin/env python3
"""
ParkEazy Monorepo Packager
Creates a Windows-compatible, pristine ZIP archive of the complete source repository.
Normalizes paths, sets standard file permissions, and excludes build/runtime artifacts.
"""

import os
import zipfile
import sys
import shutil

EXCLUDE_DIRS = {
    'node_modules',
    'dist',
    'build',
    '.git',
    'node-compile-cache',
    '.aistudio',
    '__pycache__',
    '.data',
}

EXCLUDE_EXTENSIONS = {
    '.pyc',
    '.log',
}

def collect_files(base_dir):
    archive_files = []
    for root, dirs, filenames in os.walk(base_dir):
        # Exclude directories
        dirs[:] = [
            d for d in dirs
            if d not in EXCLUDE_DIRS and not d.startswith('.hm')
        ]
        for f in filenames:
            if any(f.endswith(ext) for ext in EXCLUDE_EXTENSIONS):
                continue
            if f.endswith('.enc.json'):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir)
            # Skip transient sqlite/json state inside data
            if rel_path.startswith('apps/api/database/data/') and f.endswith('.json'):
                continue
            # Skip generated zips
            if f.endswith('.zip'):
                continue
            archive_files.append((full_path, rel_path.replace(os.sep, '/')))
    archive_files.sort(key=lambda x: x[1])
    return archive_files

def create_archive(output_zip_path, base_dir='.'):
    files = collect_files(base_dir)
    print(f"Packaging {len(files)} files into {output_zip_path}...")
    
    with zipfile.ZipFile(output_zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for full_path, arcname in files:
            # Set consistent zipinfo for cross-platform compatibility
            zinfo = zipfile.ZipInfo.from_file(full_path, arcname=arcname)
            zinfo.compress_type = zipfile.ZIP_DEFLATED
            # 0o644 permission for files, 0o755 for scripts
            if arcname.endswith('.sh') or arcname.endswith('.py') or arcname.endswith('.mjs'):
                zinfo.external_attr = 0o755 << 16
            else:
                zinfo.external_attr = 0o644 << 16
            
            with open(full_path, 'rb') as f:
                zipf.writestr(zinfo, f.read())
                
    file_size_bytes = os.path.getsize(output_zip_path)
    file_size_mb = file_size_bytes / (1024 * 1024)
    print(f"Archive created successfully: {output_zip_path} ({file_size_mb:.2f} MB, {file_size_bytes:,} bytes)")
    return len(files), file_size_bytes

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'parkeazy-Host-ParkingSpace-PH08-complete.zip'
    create_archive(target)
