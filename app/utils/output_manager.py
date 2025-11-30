"""Output file management utilities for archiving and versioning.

NOTE: Archiving is only useful for CLI/development use (single user).
For production/API use, the system uses unique temp files per run (see discovery.py).
"""
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path("output")
ARCHIVE_DIR = OUTPUT_DIR / "archive"
TEMP_DIR = OUTPUT_DIR / "temp"


def archive_existing_outputs(output_files: Optional[List[str]] = None) -> None:
    """
    Archive existing output files before they're overwritten.
    
    Creates a timestamped archive directory and copies current files there.
    Keeps the latest files in the main output directory for compatibility.
    
    Args:
        output_files: List of filenames to archive. If None, archives the standard 3 files.
    """
    if output_files is None:
        output_files = [
            "profile_analysis.md",
            "startup_ideas_research.md",
            "personalized_recommendations.md",
        ]
    
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(exist_ok=True)
    ARCHIVE_DIR.mkdir(exist_ok=True)
    
    # Check if any files exist to archive
    files_to_archive = []
    for filename in output_files:
        filepath = OUTPUT_DIR / filename
        if filepath.exists() and filepath.stat().st_size > 0:
            files_to_archive.append((filename, filepath))
    
    if not files_to_archive:
        logger.debug("No existing output files to archive")
        return
    
    # Create timestamped archive directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    archive_subdir = ARCHIVE_DIR / timestamp
    archive_subdir.mkdir(exist_ok=True)
    
    # Copy files to archive
    archived_count = 0
    for filename, filepath in files_to_archive:
        try:
            archive_path = archive_subdir / filename
            shutil.copy2(filepath, archive_path)
            archived_count += 1
            logger.info(f"Archived {filename} to {archive_path}")
        except Exception as e:
            logger.warning(f"Failed to archive {filename}: {e}")
    
    if archived_count > 0:
        logger.info(f"Archived {archived_count} file(s) to {archive_subdir}")
    
    # Cleanup old archives (keep last 50 runs)
    cleanup_old_archives(max_archives=50)


def cleanup_old_archives(max_archives: int = 50) -> None:
    """
    Remove old archive directories, keeping only the most recent ones.
    
    Args:
        max_archives: Maximum number of archive directories to keep.
    """
    if not ARCHIVE_DIR.exists():
        return
    
    try:
        # Get all archive directories sorted by modification time (newest first)
        archive_dirs = [
            d for d in ARCHIVE_DIR.iterdir()
            if d.is_dir() and d.name.replace("_", "").isdigit()
        ]
        archive_dirs.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        # Remove directories beyond the limit
        if len(archive_dirs) > max_archives:
            for old_dir in archive_dirs[max_archives:]:
                try:
                    shutil.rmtree(old_dir)
                    logger.info(f"Removed old archive: {old_dir}")
                except Exception as e:
                    logger.warning(f"Failed to remove old archive {old_dir}: {e}")
    except Exception as e:
        logger.warning(f"Error during archive cleanup: {e}")


def list_archived_runs() -> List[dict]:
    """
    List all archived runs with their timestamps.
    
    Returns:
        List of dicts with 'timestamp', 'path', and 'files' keys.
    """
    if not ARCHIVE_DIR.exists():
        return []
    
    archived_runs = []
    try:
        archive_dirs = [
            d for d in ARCHIVE_DIR.iterdir()
            if d.is_dir() and d.name.replace("_", "").isdigit()
        ]
        archive_dirs.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        for archive_dir in archive_dirs:
            files = [f.name for f in archive_dir.iterdir() if f.is_file()]
            archived_runs.append({
                "timestamp": archive_dir.name,
                "path": str(archive_dir),
                "files": files,
                "file_count": len(files),
            })
    except Exception as e:
        logger.warning(f"Error listing archived runs: {e}")
    
    return archived_runs


def cleanup_old_temp_files(max_age_hours: int = 1) -> None:
    """
    Clean up old temporary files from system temp directory.
    
    This is critical for high-concurrency scenarios (1000+ users) to prevent
    disk space issues from orphaned files.
    
    Args:
        max_age_hours: Remove temp files older than this many hours. Default 1 (aggressive cleanup).
    """
    import tempfile
    
    temp_output_dir = Path(tempfile.gettempdir()) / "idea_crew_outputs"
    if not temp_output_dir.exists():
        return
    
    try:
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
        cleaned_count = 0
        total_size = 0
        
        for temp_file in temp_output_dir.iterdir():
            if temp_file.is_file() and temp_file.name.startswith(("run_", "idea_crew_")):
                try:
                    file_stat = temp_file.stat()
                    if file_stat.st_mtime < cutoff_time:
                        file_size = file_stat.st_size
                        temp_file.unlink()
                        cleaned_count += 1
                        total_size += file_size
                except Exception as e:
                    logger.debug(f"Failed to remove old temp file {temp_file}: {e}")
        
        if cleaned_count > 0:
            size_mb = total_size / (1024 * 1024)
            logger.info(f"Cleaned up {cleaned_count} old temp file(s) ({size_mb:.2f} MB) from {temp_output_dir}")
    except Exception as e:
        logger.warning(f"Error during temp file cleanup: {e}")
    
    # Also cleanup local output/temp if it exists (legacy)
    if TEMP_DIR.exists():
        try:
            cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
            for temp_file in TEMP_DIR.iterdir():
                if temp_file.is_file():
                    try:
                        if temp_file.stat().st_mtime < cutoff_time:
                            temp_file.unlink()
                    except Exception:
                        pass
        except Exception:
            pass

