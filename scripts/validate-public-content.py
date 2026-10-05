"""Validate the public privacy boundary and static expert/programme references."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FIELDS = {'id', 'name', 'photo', 'profile', 'role', 'text'}


def validate(experts, program, public=ROOT / 'public'):
    ids = set()
    for expert in experts:
        if set(expert) != PUBLIC_FIELDS:
            raise ValueError('Public expert fields must match the exact allowlist')
        if any(not isinstance(value, str) or not value.strip() for value in expert.values()):
            raise ValueError('Public expert fields must be nonempty strings')
        if expert['id'] in ids:
            raise ValueError('Duplicate public expert ID')
        ids.add(expert['id'])
        if re.fullmatch(r'Участник VK \d+', expert['name']):
            raise ValueError('Set a public expert name before export; VK placeholders cannot be published')
        if expert['id'].startswith('legacy-vk-'):
            raise ValueError('Public expert ID must not encode a VK identity')
        if expert['name'] == 'Татьяна Хотеева':
            raise ValueError('Excluded expert cannot be published')
        photo = Path(expert['photo'])
        if photo.is_absolute() or '..' in photo.parts or not (public / photo).is_file():
            raise ValueError('Invalid or missing expert portrait')
        if not expert['profile'].startswith('https://'):
            raise ValueError('Expert profile must use HTTPS')
    for session in program:
        for uid in session.get('people', []):
            if uid not in ids:
                raise ValueError(f'Unknown programme expert: {uid}')


if __name__ == '__main__':
    validate(json.loads((ROOT / 'src/experts.json').read_text()),
             json.loads((ROOT / 'src/program.json').read_text()))
    print('Public fields, portraits and programme references validated')
