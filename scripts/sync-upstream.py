#!/usr/bin/env python3
"""
sync-upstream.py -- Smart upstream sync for military-orbat-platform.

Copies files from apps/web-source (git submodule of orbat-mapper) into the
target app folder, skipping protected custom files and tracking sync state.

Usage:
    python scripts/sync-upstream.py [options]

Examples:
    # Pull latest upstream first, then preview
    git -C apps/web-source pull
    python scripts/sync-upstream.py --dry-run

    # Interactive mode -- accept/skip per file
    python scripts/sync-upstream.py

    # Accept all safe changes automatically
    python scripts/sync-upstream.py --accept-safe

    # Show diff for a specific file
    python scripts/sync-upstream.py --diff src/components/MapContainer.vue

    # Show new commits since last sync
    python scripts/sync-upstream.py --log
"""

import argparse
import difflib
import fnmatch
import hashlib
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CUSTOM_FILES_PATH = SCRIPT_DIR / "custom-files.txt"
SYNC_STATE_PATH = SCRIPT_DIR / ".sync-state.json"

# Default paths (submodule source -> target app)
DEFAULT_UPSTREAM = "apps/web-source"
DEFAULT_TARGET = "apps/web"

# Directories/files to always skip (upstream meta, not source code)
ALWAYS_SKIP = {
    ".git",
    ".github",
    ".agent",
    ".codex",
    "docs",
    "functions",
    "images",
    "node_modules",
    ".next",
    "dist",
    "CHANGELOG.md",
    "LICENSE",
    "README.md",
    "pnpm-workspace.yaml",
    "pnpm-lock.yaml",
    "SYNC-VERSION.txt",
}


class FileStatus(Enum):
    NEW = "NEW"
    MODIFIED = "MODIFIED"
    DELETED = "DELETED"
    UNCHANGED = "UNCHANGED"
    PROTECTED = "PROTECTED"


@dataclass
class FileChange:
    rel_path: str
    status: FileStatus
    protected: bool = False
    upstream_hash: str = ""
    local_hash: str = ""


@dataclass
class SyncState:
    last_synced_sha: str = ""
    last_synced_date: str = ""
    synced_files: list = field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def file_hash(path: Path) -> str:
    """SHA-256 hash of file contents."""
    if not path.exists():
        return ""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def get_git_sha(repo_path: Path) -> str:
    """Get HEAD commit SHA of a git repo."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def get_git_log_oneline(repo_path: Path, from_sha: str, to_sha: str = "HEAD") -> str:
    """Get git log between two commits."""
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "--no-merges", f"{from_sha}..{to_sha}"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def get_git_date(repo_path: Path, sha: str = "HEAD") -> str:
    """Get commit date."""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%ci", sha],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()[:10]
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def load_custom_patterns() -> list[str]:
    """Load glob patterns from custom-files.txt."""
    if not CUSTOM_FILES_PATH.exists():
        return []

    patterns = []
    with open(CUSTOM_FILES_PATH) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                patterns.append(line)
    return patterns


def is_protected(rel_path: str, patterns: list[str]) -> bool:
    """Check if a relative path matches any protected pattern."""
    # Normalize to forward slashes
    rel_path = rel_path.replace("\\", "/")
    for pattern in patterns:
        pattern = pattern.replace("\\", "/")
        # Direct match
        if fnmatch.fnmatch(rel_path, pattern):
            return True
        # Directory wildcard: "src/modules/auth/*" should match nested files
        if pattern.endswith("/*"):
            dir_prefix = pattern[:-2]
            if rel_path.startswith(dir_prefix + "/") or rel_path == dir_prefix:
                return True
    return False


def should_skip_path(rel_path: str) -> bool:
    """Check if a path should be entirely skipped (upstream meta)."""
    parts = Path(rel_path).parts
    if not parts:
        return True
    return parts[0] in ALWAYS_SKIP


def collect_files(root: Path) -> dict[str, str]:
    """Walk a directory and return {relative_path: sha256_hash}."""
    files = {}
    for dirpath, dirnames, filenames in os.walk(root):
        # Filter out always-skip dirs in-place
        dirnames[:] = [d for d in dirnames if d not in ALWAYS_SKIP]

        for fname in filenames:
            full = Path(dirpath) / fname
            rel = str(full.relative_to(root)).replace("\\", "/")
            if not should_skip_path(rel):
                files[rel] = file_hash(full)
    return files


def load_sync_state() -> SyncState:
    """Load last sync state from .sync-state.json."""
    if SYNC_STATE_PATH.exists():
        with open(SYNC_STATE_PATH) as f:
            data = json.load(f)
            return SyncState(**data)
    return SyncState()


def save_sync_state(state: SyncState):
    """Save sync state to .sync-state.json."""
    with open(SYNC_STATE_PATH, "w") as f:
        json.dump(
            {
                "last_synced_sha": state.last_synced_sha,
                "last_synced_date": state.last_synced_date,
                "synced_files": state.synced_files,
            },
            f,
            indent=2,
        )


def get_git_subject(repo_path: Path, sha: str = "HEAD") -> str:
    """Get commit subject line."""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%s", sha],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def generate_version_file(
    target_path: Path,
    upstream_path: Path,
    sync_state: SyncState,
    changes_applied: int,
    protected_count: int,
):
    """Generate SYNC-VERSION.txt in the target folder with sync info."""
    upstream_sha = sync_state.last_synced_sha
    upstream_date = sync_state.last_synced_date
    subject = get_git_subject(upstream_path, upstream_sha or "HEAD")
    now = subprocess.run(
        ["git", "log", "-1", "--format=%ci", "HEAD"],
        cwd=upstream_path,
        capture_output=True,
        text=True,
    )

    # Get recent upstream commits for context
    recent_log = ""
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "--no-merges", "-10"],
            cwd=upstream_path,
            capture_output=True,
            text=True,
            check=True,
        )
        recent_log = result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    from datetime import datetime

    sync_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    content = f"""\
SYNC VERSION INFO
=================
Generated by sync-upstream.py -- do not edit manually.

Synced at:          {sync_timestamp}
Upstream commit:    {upstream_sha[:12] if upstream_sha else 'unknown'}
Upstream date:      {upstream_date}
Upstream message:   {subject}
Files synced:       {changes_applied}
Files protected:    {protected_count}

Source:             apps/web-source (git submodule)
Upstream repo:      https://github.com/orbat-mapper/orbat-mapper

Recent upstream commits:
{recent_log}
"""

    version_file = target_path / "SYNC-VERSION.txt"
    version_file.write_text(content, encoding="utf-8")
    print(f"  Version file written: {version_file.relative_to(PROJECT_ROOT)}")


def show_diff(upstream_file: Path, local_file: Path, rel_path: str):
    """Show unified diff between upstream and local file."""
    try:
        upstream_lines = upstream_file.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True)
    except FileNotFoundError:
        upstream_lines = []

    try:
        local_lines = local_file.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True)
    except FileNotFoundError:
        local_lines = []

    diff = difflib.unified_diff(
        local_lines,
        upstream_lines,
        fromfile=f"local/{rel_path}",
        tofile=f"upstream/{rel_path}",
        lineterm="",
    )

    diff_text = "\n".join(diff)
    if not diff_text:
        print("  (no text differences — possibly binary file)")
    else:
        # Colorize output
        for line in diff_text.split("\n"):
            if line.startswith("+++") or line.startswith("---"):
                print(f"\033[1m{line}\033[0m")
            elif line.startswith("+"):
                print(f"\033[32m{line}\033[0m")
            elif line.startswith("-"):
                print(f"\033[31m{line}\033[0m")
            elif line.startswith("@@"):
                print(f"\033[36m{line}\033[0m")
            else:
                print(line)


def prompt_choice(message: str, choices: str = "ynds") -> str:
    """Prompt user for a single-character choice."""
    choice_display = "/".join(choices)
    while True:
        try:
            answer = input(f"  {message} [{choice_display}]: ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\n  Aborted.")
            sys.exit(1)
        if answer and answer[0] in choices:
            return answer[0]
        print(f"  Please enter one of: {choice_display}")


# ---------------------------------------------------------------------------
# Core sync logic
# ---------------------------------------------------------------------------


def compute_changes(
    upstream_files: dict[str, str],
    local_files: dict[str, str],
    custom_patterns: list[str],
) -> list[FileChange]:
    """Compare upstream and local files, return list of changes."""
    changes = []
    all_paths = sorted(set(upstream_files.keys()) | set(local_files.keys()))

    for rel_path in all_paths:
        upstream_hash = upstream_files.get(rel_path, "")
        local_hash = local_files.get(rel_path, "")
        protected = is_protected(rel_path, custom_patterns)

        if upstream_hash and not local_hash:
            changes.append(FileChange(rel_path, FileStatus.NEW, protected, upstream_hash, local_hash))
        elif not upstream_hash and local_hash:
            # File exists locally but not upstream — could be custom or deleted upstream
            if protected:
                # Custom file, ignore
                continue
            changes.append(FileChange(rel_path, FileStatus.DELETED, protected, upstream_hash, local_hash))
        elif upstream_hash != local_hash:
            if protected:
                changes.append(FileChange(rel_path, FileStatus.PROTECTED, True, upstream_hash, local_hash))
            else:
                changes.append(FileChange(rel_path, FileStatus.MODIFIED, False, upstream_hash, local_hash))
        # else: unchanged, skip

    return changes


def print_summary(changes: list[FileChange], upstream_path: Path, sync_state: SyncState):
    """Print a summary of changes."""
    upstream_sha = get_git_sha(upstream_path)
    upstream_date = get_git_date(upstream_path)

    print()
    print("=" * 60)
    print("  UPSTREAM SYNC SUMMARY")
    print("=" * 60)
    print(f"  Upstream commit: {upstream_sha[:12]} ({upstream_date})")

    if sync_state.last_synced_sha:
        print(f"  Last synced:     {sync_state.last_synced_sha[:12]} ({sync_state.last_synced_date})")
        log = get_git_log_oneline(upstream_path, sync_state.last_synced_sha)
        if log:
            commit_count = len(log.strip().split("\n"))
            print(f"  New commits:     {commit_count}")
    else:
        print("  Last synced:     (first sync)")

    new_files = [c for c in changes if c.status == FileStatus.NEW]
    modified = [c for c in changes if c.status == FileStatus.MODIFIED]
    deleted = [c for c in changes if c.status == FileStatus.DELETED]
    protected = [c for c in changes if c.status == FileStatus.PROTECTED]
    total_actionable = len(new_files) + len(modified) + len(deleted)

    print()
    print(f"  Total changes: {total_actionable} actionable, {len(protected)} protected")
    print("-" * 60)

    if new_files:
        print(f"\n  \033[32mNEW upstream files ({len(new_files)}):\033[0m")
        for c in new_files:
            print(f"    + {c.rel_path}")

    if modified:
        print(f"\n  \033[33mMODIFIED upstream files ({len(modified)}):\033[0m")
        for c in modified:
            print(f"    ~ {c.rel_path}")

    if deleted:
        print(f"\n  \033[31mDELETED from upstream ({len(deleted)}):\033[0m")
        for c in deleted:
            print(f"    - {c.rel_path}")

    if protected:
        print(f"\n  \033[36mPROTECTED -- skipped ({len(protected)}):\033[0m")
        for c in protected:
            print(f"    [skip] {c.rel_path}")

    print()


def run_interactive(
    changes: list[FileChange],
    upstream_path: Path,
    target_path: Path,
    dry_run: bool = False,
):
    """Interactive mode: accept/skip each changed file."""
    actionable = [c for c in changes if c.status in (FileStatus.NEW, FileStatus.MODIFIED, FileStatus.DELETED)]

    if not actionable:
        print("  Nothing to sync — all files are up to date.")
        return []

    accepted = []
    total = len(actionable)

    print(f"  Processing {total} changes interactively...")
    print("  Keys: (y)es accept, (n)o skip, (d)iff view, (s)kip rest, (a)ccept rest")
    print()

    accept_rest = False

    for i, change in enumerate(actionable, 1):
        status_color = {
            FileStatus.NEW: "\033[32m",
            FileStatus.MODIFIED: "\033[33m",
            FileStatus.DELETED: "\033[31m",
        }
        color = status_color.get(change.status, "")
        reset = "\033[0m"

        print(f"  [{i}/{total}] {color}{change.status.value}{reset}: {change.rel_path}")

        if accept_rest:
            print("    → auto-accepted")
            accepted.append(change)
            continue

        while True:
            choice = prompt_choice("Accept?", "yndsa")

            if choice == "d":
                # Show diff
                upstream_file = upstream_path / change.rel_path
                local_file = target_path / change.rel_path
                print()
                show_diff(upstream_file, local_file, change.rel_path)
                print()
                continue
            elif choice == "y":
                accepted.append(change)
                break
            elif choice == "n":
                print("    → skipped")
                break
            elif choice == "s":
                print("    → skipping rest")
                return accepted
            elif choice == "a":
                accept_rest = True
                accepted.append(change)
                print("    → accepting rest")
                break

    return accepted


def apply_changes(
    accepted: list[FileChange],
    upstream_path: Path,
    target_path: Path,
    dry_run: bool = False,
):
    """Apply accepted changes: copy new/modified, delete removed."""
    if not accepted:
        print("  No changes to apply.")
        return

    print()
    if dry_run:
        print("  DRY RUN — no files will be changed:")
    else:
        print("  Applying changes:")

    for change in accepted:
        src = upstream_path / change.rel_path
        dst = target_path / change.rel_path

        if change.status == FileStatus.DELETED:
            if dry_run:
                print(f"    [delete] {change.rel_path}")
            else:
                if dst.exists():
                    dst.unlink()
                    print(f"    \033[31mx deleted\033[0m {change.rel_path}")
                    # Remove empty parent dirs
                    parent = dst.parent
                    while parent != target_path and not any(parent.iterdir()):
                        parent.rmdir()
                        parent = parent.parent
        else:
            if dry_run:
                print(f"    [copy] {change.rel_path}")
            else:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                symbol = "+" if change.status == FileStatus.NEW else "~"
                color = "\033[32m" if change.status == FileStatus.NEW else "\033[33m"
                print(f"    {color}{symbol} copied\033[0m  {change.rel_path}")

    print()
    print(f"  Done. {len(accepted)} files {'would be ' if dry_run else ''}processed.")


# ---------------------------------------------------------------------------
# Single-file diff command
# ---------------------------------------------------------------------------


def show_single_diff(upstream_path: Path, target_path: Path, rel_path: str):
    """Show diff for a single file."""
    upstream_file = upstream_path / rel_path
    local_file = target_path / rel_path

    if not upstream_file.exists() and not local_file.exists():
        print(f"  File not found in either location: {rel_path}")
        return

    print(f"\n  Diff: {rel_path}")
    print("-" * 60)
    show_diff(upstream_file, local_file, rel_path)
    print()


# ---------------------------------------------------------------------------
# New commits log command
# ---------------------------------------------------------------------------


def show_new_commits(upstream_path: Path):
    """Show new upstream commits since last sync."""
    state = load_sync_state()
    if not state.last_synced_sha:
        print("  No sync state found. Showing last 20 commits:")
        try:
            result = subprocess.run(
                ["git", "log", "--oneline", "--no-merges", "-20"],
                cwd=upstream_path,
                capture_output=True,
                text=True,
                check=True,
            )
            print(result.stdout)
        except subprocess.CalledProcessError:
            print("  Failed to read git log.")
        return

    log = get_git_log_oneline(upstream_path, state.last_synced_sha)
    if log:
        count = len(log.strip().split("\n"))
        print(f"  {count} new commits since last sync ({state.last_synced_sha[:12]}):\n")
        print(log)
    else:
        print("  No new commits since last sync.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Sync upstream orbat-mapper (apps/web-source) into target app",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Defaults:
  upstream: {DEFAULT_UPSTREAM} (git submodule)
  target:   {DEFAULT_TARGET}

Examples:
  python scripts/sync-upstream.py --dry-run
  python scripts/sync-upstream.py --accept-safe
  python scripts/sync-upstream.py --diff src/components/MapContainer.vue
  python scripts/sync-upstream.py --log

  # Pull latest upstream first
  git -C apps/web-source pull
  python scripts/sync-upstream.py

  # Use a different source/target
  python scripts/sync-upstream.py --upstream ~/my-fork --target apps/web
        """,
    )
    parser.add_argument(
        "--upstream",
        default=DEFAULT_UPSTREAM,
        help=f"Path to upstream clone (default: {DEFAULT_UPSTREAM})",
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without applying")
    parser.add_argument("--accept-safe", action="store_true", help="Auto-accept unprotected changes")
    parser.add_argument("--diff", metavar="FILE", help="Show diff for a single file")
    parser.add_argument("--log", action="store_true", help="Show new commits since last sync")
    parser.add_argument(
        "--target",
        default=DEFAULT_TARGET,
        help=f"Target directory relative to project root (default: {DEFAULT_TARGET})",
    )
    parser.add_argument("--pull", action="store_true", help="Git pull upstream before syncing")

    args = parser.parse_args()

    # Resolve paths: if relative, treat as relative to PROJECT_ROOT
    upstream_raw = Path(args.upstream)
    if upstream_raw.is_absolute():
        upstream_path = upstream_raw.resolve()
    else:
        upstream_path = (PROJECT_ROOT / upstream_raw).resolve()

    target_path = (PROJECT_ROOT / args.target).resolve()

    # Validate paths
    if not upstream_path.exists():
        print(f"  Error: upstream path does not exist: {upstream_path}")
        if args.upstream == DEFAULT_UPSTREAM:
            print(f"  Run: git submodule update --init")
        sys.exit(1)
    if not (upstream_path / ".git").exists() and not (upstream_path / "src").exists():
        print(f"  Error: doesn't look like an orbat-mapper clone: {upstream_path}")
        sys.exit(1)
    if not target_path.exists():
        print(f"  Target does not exist, creating: {args.target}")
        target_path.mkdir(parents=True)

    # Handle --log
    if args.log:
        show_new_commits(upstream_path)
        return

    # Handle --diff
    if args.diff:
        show_single_diff(upstream_path, target_path, args.diff)
        return

    # Handle --pull: pull first, then show preview and ask before syncing
    if args.pull:
        sha_before = get_git_sha(upstream_path)
        print(f"  Pulling latest upstream...")
        result = subprocess.run(
            ["git", "pull"],
            cwd=upstream_path,
            capture_output=True,
            text=True,
        )
        print(f"  {result.stdout.strip()}")
        if result.returncode != 0:
            print(f"  Warning: git pull failed: {result.stderr.strip()}")
            sys.exit(1)

        sha_after = get_git_sha(upstream_path)
        if sha_before == sha_after:
            print("  Already up to date, nothing new pulled.")
        else:
            log = get_git_log_oneline(upstream_path, sha_before, sha_after)
            count = len(log.strip().split("\n")) if log else 0
            print(f"\n  Pulled {count} new commits:")
            print(f"  {sha_before[:12]} -> {sha_after[:12]}\n")
            if log:
                for line in log.split("\n"):
                    print(f"    {line}")
            print()

    # Load state and patterns
    sync_state = load_sync_state()
    custom_patterns = load_custom_patterns()

    print(f"  Upstream: {upstream_path}")
    print(f"  Target:   {target_path}")
    print(f"  Protected patterns: {len(custom_patterns)}")
    print()
    print("  Scanning files...")

    # Collect and compare files
    upstream_files = collect_files(upstream_path)
    local_files = collect_files(target_path)

    print(f"  Upstream: {len(upstream_files)} files")
    print(f"  Local:    {len(local_files)} files")

    changes = compute_changes(upstream_files, local_files, custom_patterns)

    # Print summary
    print_summary(changes, upstream_path, sync_state)

    actionable = [c for c in changes if c.status in (FileStatus.NEW, FileStatus.MODIFIED, FileStatus.DELETED)]

    if not actionable:
        print("  Everything is up to date.")
        return

    if args.dry_run:
        apply_changes(actionable, upstream_path, target_path, dry_run=True)
        return

    # Always ask before applying (unless --accept-safe)
    if args.accept_safe:
        choice = prompt_choice(
            f"Accept all {len(actionable)} safe changes?", "yn"
        )
        if choice == "n":
            print("  Aborted. No files changed.")
            return
        print("  Applying all safe (unprotected) changes...")
        apply_changes(actionable, upstream_path, target_path)
    else:
        # Ask: proceed interactively or abort?
        print("  How to proceed?")
        choice = prompt_choice(
            "(i)nteractive per-file, (a)ccept all, (q)uit", "iaq"
        )
        if choice == "q":
            print("  Aborted. No files changed.")
            return
        elif choice == "a":
            apply_changes(actionable, upstream_path, target_path)
        else:
            accepted = run_interactive(changes, upstream_path, target_path)
            apply_changes(accepted, upstream_path, target_path)

    # Update sync state
    protected_changes = [c for c in changes if c.status == FileStatus.PROTECTED]
    new_sha = get_git_sha(upstream_path)
    new_date = get_git_date(upstream_path)
    sync_state.last_synced_sha = new_sha
    sync_state.last_synced_date = new_date
    sync_state.synced_files = [c.rel_path for c in actionable]
    save_sync_state(sync_state)

    print(f"  Sync state saved: {new_sha[:12]} ({new_date})")

    # Generate version file in target
    generate_version_file(
        target_path,
        upstream_path,
        sync_state,
        changes_applied=len(actionable),
        protected_count=len(protected_changes),
    )


if __name__ == "__main__":
    main()
