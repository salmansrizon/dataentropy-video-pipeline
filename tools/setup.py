"""Set up a fresh clone: Node packages, Python packages, the voice environment, and a self-test.

Run: python tools/setup.py [--with chatterbox] [--skip-voice]
Needs: Node 18+, Python 3.10+, and `uv` (https://docs.astral.sh/uv/) for the voice environments.
The Kokoro voice needs Python 3.10-3.12, so it gets its own environment (.venv-kokoro); uv downloads that
Python if the machine does not have it. Model files go to .hf-cache/ in the repository (not the home drive).
Optional: set TYPESAFE_API_KEY to have Jev make the review judgments; without it Claude answers them.
Tested on Windows 11. macOS and Linux use the same commands but have not been run by the authors.
"""
import os, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = ["typesafe-sdk", "numpy", "scipy"]
VOICES = {"kokoro": ("3.12", ["kokoro>=0.9.4", "soundfile", "transformers>=4.44", "tokenizers>=0.19"]),
          "chatterbox": ("3.11", ["chatterbox-tts", "soundfile", "setuptools<81"])}


def run(cmd, **kw):
    print("  $", cmd if isinstance(cmd, str) else " ".join(cmd), flush=True)
    return subprocess.run(cmd, cwd=ROOT, shell=isinstance(cmd, str), **kw)


def need(tool, hint):
    if not shutil.which(tool):
        sys.exit(f"missing: {tool}. {hint}")


def venv_python(name):
    env = ROOT / f".venv-{name}"
    return env / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def main():
    if sys.version_info < (3, 10):
        sys.exit("Python 3.10 or newer is required")
    need("node", "Install Node.js 18 or newer from https://nodejs.org")
    need("npm", "It ships with Node.js")
    print("1/4 Node packages (one install for the engine and every video)")
    run("npm install", check=True)
    print("2/4 Python packages for the tools")
    run([sys.executable, "-m", "pip", "install", "--quiet", *BASE], check=True)
    wanted = [] if "--skip-voice" in sys.argv else ["kokoro"]
    if "--with" in sys.argv:
        wanted.append(sys.argv[sys.argv.index("--with") + 1])
    print(f"3/4 Voice environments: {wanted or 'skipped'}")
    for name in wanted:
        if name not in VOICES:
            sys.exit(f"unknown voice environment '{name}'; choose from {sorted(VOICES)}")
        need("uv", "Install it from https://docs.astral.sh/uv/ (it creates the Python environments the voices need)")
        version, packages = VOICES[name]
        if not venv_python(name).exists():
            run(["uv", "venv", f".venv-{name}", "--python", version], check=True)
        run(["uv", "pip", "install", "--python", str(venv_python(name)), *packages], check=True)
    print("4/4 Self-test")
    ok = run("npm run typecheck", capture_output=True, text=True).returncode == 0
    print("  typecheck:", "ok" if ok else "FAILED (run `npm run typecheck` to see why)")
    print("  review judgments:", "Jev (TYPESAFE_API_KEY is set)" if os.environ.get("TYPESAFE_API_KEY") else "Claude (no TYPESAFE_API_KEY; see tools/lib.py)")
    print("\nReady. Try the example:\n  python tools/vo.py sql-select --fit\n  python tools/make_music.py sql-select\n  python tools/render.py sql-select --stills")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
