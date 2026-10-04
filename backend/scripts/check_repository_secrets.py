"""Heuristic scan of tracked text for common secret formats. Not a security audit."""

from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PATTERNS = [
    ("private key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    (
        "GitHub token",
        re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b"),
    ),
    ("AWS access key", re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b")),
    (
        "JWT token value",
        re.compile(
            r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"
        ),
    ),
]


def main():
    paths = (
        subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
        .decode()
        .split("\0")
    )
    issues = []
    for name in filter(None, paths):
        path = ROOT / name
        if not path.is_file():
            continue
        if path.name.startswith(".env") and path.name != ".env.example":
            issues.append(f"{name}: environment file must not be tracked")
        try:
            content = path.read_text()
        except (UnicodeDecodeError, OSError):
            continue
        for label, pattern in PATTERNS:
            for match in pattern.finditer(content):
                # Only locations and categories are printed, never matched values.
                line = content.count("\n", 0, match.start()) + 1
                issues.append(f"{name}:{line}: possible {label}")
    if issues:
        raise SystemExit("\n".join(issues))
    print(
        "Tracked-file heuristic secret scan passed. History and provider-specific formats are outside this check."
    )


if __name__ == "__main__":
    main()
