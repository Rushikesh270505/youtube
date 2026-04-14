Drop custom Piper voice packs here.

Expected layout:

- `voice_assets/neutral_analyst/neutral_analyst.onnx`
- `voice_assets/high_energy_host/high_energy_host.onnx`
- `voice_assets/calm_educator/calm_educator.onnx`

The voice service can now use imported AI Studio voice identities directly through Gemini TTS. If Gemini is unavailable, the app falls back to the configured macOS `say` voices so commentary still works on this MacBook.

AI Studio voice-library folders are not directly convertible into Piper runtime models because they do not contain exported local synthesis weights. To move custom hosts toward true local playback in this repo:

- import the AI Studio pack identity with `python3 scripts/import_ai_studio_voice_packs.py`
- create a local recording workspace with `python3 scripts/create_local_voice_training_workspace.py`
- record sample lines into `voice_assets/training_workspace/<pack_id>/raw_samples/`
- train or fine-tune a local voice model externally
- place the final `.onnx` model at:
  - `voice_assets/neutral_analyst/neutral_analyst.onnx`
  - `voice_assets/high_energy_host/high_energy_host.onnx`
  - `voice_assets/calm_educator/calm_educator.onnx`
