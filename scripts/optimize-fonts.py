"""Maintenance only: pip install fonttools==4.66.1 brotli==1.2.0.
Run from any directory: python scripts/optimize-fonts.py.
Keep original fonts and licenses; retain every Unicode mapping and shaping table.
"""
from hashlib import sha256
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parent.parent
css_path = root / 'src/fonts.css'
css = css_path.read_text()
for name, upper in [('golos-text', 700), ('manrope', 800)]:
    source, = (root / 'scripts/font-sources').glob(f'{name}-latin.*.woff2')
    font = TTFont(source, recalcTimestamp=False)
    original_cmap = font.getBestCmap().copy()
    font = instantiateVariableFont(font, {'wght': (400, upper)}, inplace=True)
    assert font.getBestCmap() == original_cmap, 'Unicode coverage must remain identical'
    # Deterministic output; never rebuild source from an already trimmed font.
    temporary = root / 'public/fonts' / f'{name}-latin.tmp.woff2'
    font.save(temporary)
    data = temporary.read_bytes()
    temporary.unlink()
    filename = f'{name}-latin.{sha256(data).hexdigest()[:16]}.woff2'
    import re
    css = re.sub(rf'{name}-latin\.[a-f0-9]+\.woff2', filename, css)
    (root / 'public/fonts' / filename).write_bytes(data)
    for old in (root / 'public/fonts').glob(f'{name}-latin.*.woff2'):
        if old.name != filename:
            old.unlink()
    print(f'{name}: {source.stat().st_size} → {len(data)} bytes; all Unicode mappings retained')
css_path.write_text(css)
