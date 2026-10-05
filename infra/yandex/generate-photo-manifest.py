"""Package approved existing portrait paths for API validation (no uploads)."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
experts = json.loads((root / 'src/experts.json').read_text(encoding='utf-8'))
photos = sorted({expert['photo'] for expert in experts if expert['name'] != 'Татьяна Хотеева'})
for photo in photos:
    path = Path(photo)
    if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] != 'girls':
        raise ValueError('Unsafe portrait path')
    if not (root / 'public' / path).is_file():
        raise ValueError('Missing portrait: ' + photo)
(root / 'infra/yandex/admin/allowed-photos.json').write_text(
    json.dumps(photos, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
