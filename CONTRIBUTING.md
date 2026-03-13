# Contributing to BitBoy Lab

Thank you for considering a contribution! Here's how to get set up.

## Setup

```bash
git clone https://github.com/hrdwre/bitboy-lab.git
cd bitboy-lab

python3 -m venv .venv
source .venv/bin/activate

pip3 install -r requirements.txt
pip3 install ruff mypy   # dev tools
```

## Code Style

- **PEP 8** — enforced via `ruff`
- **Type hints** — all public functions must have annotated arguments and return types
- **Docstrings** — Google style; every module, class, and public function needs one
- Line length: 100 characters (`ruff` default in `pyproject.toml`)

Run linter:
```bash
ruff check .
ruff format .
```

## Adding an Effect

1. Create `core/effects/my_effect.py`:
   ```python
   def apply_my_effect(img: Image.Image, mask: np.ndarray, **params) -> Image.Image:
       """One-line summary.

       Args: ...
       Returns: RGBA PIL Image.
       """
   ```
2. Export from `core/effects/__init__.py`
3. Dispatch in `Engine._render_layer()` — add `elif layer_type == "MY_EFFECT":` branch
4. Add `EffectSchema` to `api/routes/effects.py`
5. Add default config in `app.py` → `EFF_DEFS` and `scripts/cli.py` → `_PRESETS`
6. Document parameters in `docs/effects.md`

## Running Tests

```bash
python3 scripts/test_engine.py
```

All 6 effects must pass before opening a PR.

## Pull Request Process

1. Fork the repo and create a branch: `feature/my-effect`
2. Ensure `ruff check .` passes with zero warnings
3. Ensure `python3 scripts/test_engine.py` passes
4. Open a PR with a clear description of what your effect does
5. Include a before/after screenshot if applicable

## Commit Convention

```
feat: add halftone dither pattern
fix: normalise edge detect magnitude when max=0
docs: update effects.md with halftone params
perf: vectorise CRT row displacement
```
