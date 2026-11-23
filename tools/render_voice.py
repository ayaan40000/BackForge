"""Render the Live coach's sentences with a neural voice (Kokoro-82M, Apache-2.0,
run on-device with kokoro-onnx) into app/voice/<voice>/*.m4a + manifest.json.

  python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
  node tools/voice_corpus.mjs > /tmp/corpus.json
  .venv/bin/python tools/render_voice.py /tmp/corpus.json --voice af_heart --model kokoro-v1.0.onnx --voices voices-v1.0.bin

Incremental: a sentence already in the manifest is not rendered again (key = exact text).
Sentences no longer in the corpus are pruned. Needs ffmpeg (AAC, 24 kbps mono).
"""
import argparse, hashlib, json, os, re, subprocess, sys, tempfile, time
import soundfile as sf
from kokoro_onnx import Kokoro

ap = argparse.ArgumentParser()
ap.add_argument("corpus"); ap.add_argument("--voice", default="af_heart"); ap.add_argument("--speed", type=float, default=1.03)
ap.add_argument("--model", default="kokoro-v1.0.onnx"); ap.add_argument("--voices", default="voices-v1.0.bin")
ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "app", "voice"))
a = ap.parse_args()
root = os.path.abspath(os.path.join(a.out, a.voice)); os.makedirs(root, exist_ok=True)
mpath = os.path.join(root, "manifest.json")
man = json.load(open(mpath)) if os.path.exists(mpath) else {"voice": a.voice, "engine": "Kokoro-82M (Apache-2.0) via kokoro-onnx", "sentences": {}}
pron = json.load(open(os.path.join(os.path.dirname(__file__), "..", "data", "voice-pronounce.json")))["map"]
keys = sorted(pron, key=len, reverse=True)
def say(t):
    for k in keys: t = t.replace(k, pron[k])
    return re.sub(r"\s+", " ", t).strip()
corpus = json.load(open(a.corpus))["sentences"]
want = set(corpus)
for t in list(man["sentences"]):
    if t not in want:
        f = man["sentences"].pop(t)[0]
        try: os.remove(os.path.join(root, f))
        except FileNotFoundError: pass
todo = [t for t in corpus if t not in man["sentences"]]
print(f"{len(corpus)} sentences, {len(todo)} to render", flush=True)
k = Kokoro(a.model, a.voices); lang = "en-gb" if a.voice.startswith("b") else "en-us"
t0 = time.time()
for i, t in enumerate(todo):
    samples, sr = k.create(say(t), voice=a.voice, speed=a.speed, lang=lang)
    # trim leading/trailing near-silence so clips chain tightly
    import numpy as np
    nz = np.where(np.abs(samples) > 0.01)[0]
    if len(nz): samples = samples[max(0, nz[0] - int(0.03 * sr)): nz[-1] + int(0.08 * sr)]
    name = hashlib.sha1(t.encode()).hexdigest()[:12] + ".m4a"
    with tempfile.NamedTemporaryFile(suffix=".wav") as w:
        sf.write(w.name, samples, sr)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", w.name, "-ac", "1", "-c:a", "aac", "-b:a", "24k", os.path.join(root, name)], check=True)
    man["sentences"][t] = [name, round(len(samples) / sr, 2)]
    if i % 100 == 99:
        json.dump(man, open(mpath, "w"), ensure_ascii=False, separators=(",", ":"))
        el = time.time() - t0; print(f"{i+1}/{len(todo)}  {el/60:.1f} min  eta {(len(todo)-i-1)*el/(i+1)/60:.1f} min", flush=True)
json.dump(man, open(mpath, "w"), ensure_ascii=False, separators=(",", ":"))
print("done", len(man["sentences"]), "clips", flush=True)
