# Archive

Earlier videos, each a self-contained Remotion project with its own copy of the shared code. They are kept for reference and are not part of the workspace.

New videos do not follow this structure: use `python tools/new_video.py` and the engine in `engine/`.

To render one of these, run `npm install` inside its folder, re-record its voice with the script named in its `package.json`, and run `npm run render`. Their recorded audio and rendered files are not in the repository. `archive/tools/` holds the scripts they used.
