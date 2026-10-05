import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApiUrl, adminRequest } from '../admin-api';
import photos from '../../infra/yandex/admin/allowed-photos.json';
import './Admin.css';

export function AdminAccess() {
  const { access_token, signedIn, sessionRevision, isCurrentSession, setIdentity, setRoleError } = useAuth();
  useEffect(() => {
    let active = true;
    if (signedIn && access_token && adminApiUrl) {
      adminRequest(access_token, 'me').then(me => {
        if (active && isCurrentSession(access_token, sessionRevision)) setIdentity({ token: access_token, revision: sessionRevision, me });
      }).catch(error => {
        if (active && isCurrentSession(access_token, sessionRevision)) setRoleError(error.message);
      });
    }
    return () => { active = false; };
  }, [signedIn, access_token, sessionRevision, isCurrentSession, setIdentity, setRoleError]);
  return null;
}

const emptyUser = { vkontakte_id: '', name: '', note: '' };
const emptyEvent = { title: '', description: '' };
const emptyProfile = { photo: photos[0], profile_url: '', professional_title: '', bio: '', sort_order: 0 };

export function Admin() {
  const auth = useAuth();
  if (!auth.signedIn || !auth.admin) return <main id="main" className="wrap admin-page"><h1>Администрирование</h1><p>{!auth.signedIn ? 'Войдите через VK в меню сайта.' : 'Доступ предоставляется администраторам фестиваля.'}</p>{auth.roleError && <p role="alert">{auth.roleError}</p>}<a href="#">На сайт</a></main>;
  return <AdminSession key={`${auth.access_token}:${auth.sessionRevision}`} auth={auth}/>;
}

function AdminSession({ auth }) {
  const { access_token, sessionRevision, isCurrentSession, user_id } = auth;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(emptyUser);
  const [event, setEvent] = useState(emptyEvent);
  const [profile, setProfile] = useState(null);
  const alive = useRef(true);
  const operation = useRef(false);
  const nameInput = useRef(null);
  const portraitSelect = useRef(null);
  useEffect(() => { if (profile) portraitSelect.current?.focus(); }, [profile?.user_id]);
  const current = () => alive.current && isCurrentSession(access_token, sessionRevision);
  useEffect(() => {
    alive.current = true;
    let active = true;
    adminRequest(access_token, 'list').then(result => {
      if (active && isCurrentSession(access_token, sessionRevision)) setData(result);
    }).catch(err => { if (active && isCurrentSession(access_token, sessionRevision)) setError(err.message); });
    return () => { active = false; alive.current = false; };
  }, [access_token, sessionRevision, isCurrentSession]);
  async function mutate(action, values) {
    if (!current() || operation.current) return false;
    operation.current = true; setBusy(true); setError('');
    try {
      await adminRequest(access_token, action, values);
      if (!current()) return false;
      const result = await adminRequest(access_token, 'list');
      if (!current()) return false;
      setData(result); return true;
    } catch (err) { if (current()) setError(err.message); return false; }
    finally { if (current()) { operation.current = false; setBusy(false); } }
  }
  const hasRole = (id, role) => data.roles.some(row => row.user_id === id && row.role === role);
  const linked = (type, id, eid) => data[type].some(row => row.user_id === id && row.event_id === eid);
  const attendees = data?.users.filter(u => hasRole(u.id, 'attendee')) ?? [];
  const expert = id => data.expert_profiles.find(p => p.user_id === id);
  async function toggleRole(u, role, enabled) {
    if (!enabled && !window.confirm(`Снять роль «${role === 'admin' ? 'Администратор' : 'Участник'}» у ${u.name}?${role === 'attendee' ? ' Отметки посещения будут удалены.' : ''}`)) return;
    const roles = data.roles.filter(r => r.user_id === u.id && r.role !== role).map(r => r.role);
    if (enabled) roles.push(role);
    await mutate('saveRoles', { user_id: u.id, roles });
  }
  return <main id="main" className="wrap admin-page"><h1>Управление фестивалем</h1><a href="#">На сайт</a>
    <p role="alert">{error}</p><p role="status">{busy ? 'Сохраняем…' : !data ? 'Загружаем…' : ''}</p>
    <fieldset disabled={busy || !data}><legend>Посещение событий</legend>
      <p id="attendance-help">Отметьте фактическое посещение участником события. Изменения сохраняются автоматически. Снимите отметку, чтобы исправить запись.</p>
      {data && (!data.events.length ? <p>Добавьте события для отметок посещения.</p> : !attendees.length ? <p>Назначьте пользователям роль участника для отметок посещения.</p> :
        <div className="admin-attendance-scroll" role="region" aria-label="Таблица посещения событий" tabIndex={0}>
          <table className="admin-attendance" aria-describedby="attendance-help"><caption>Участники по событиям</caption>
            <thead><tr><th scope="col">Событие</th>{attendees.map(u => <th scope="col" key={u.id}>{u.name}</th>)}</tr></thead>
            <tbody>{data.events.map(ev => <tr key={ev.id}><th scope="row">{ev.title}</th>{attendees.map(u => <td key={u.id}><input type="checkbox" aria-label={`${u.name} — ${ev.title}`} checked={linked('attendance', u.id, ev.id)} onChange={e => mutate('attendance', { user_id: u.id, event_id: ev.id, enabled: e.target.checked })}/></td>)}</tr>)}</tbody>
          </table>
        </div>)}
    </fieldset>
    <fieldset disabled={busy || !data}><legend>Пользователи и роли</legend>
      <form onSubmit={async e => { e.preventDefault(); if (await mutate('saveUser', { ...user, vkontakte_id: user.vkontakte_id || null })) setUser(emptyUser); }}>
        <label>Имя<input ref={nameInput} required maxLength={300} value={user.name} onChange={e => setUser({ ...user, name: e.target.value })}/></label>
        <label>VK ID (необязательно)<input inputMode="numeric" pattern="[1-9][0-9]*" disabled={user.id === user_id || (data && user.id && hasRole(user.id, 'admin'))} value={user.vkontakte_id ?? ''} onChange={e => setUser({ ...user, vkontakte_id: e.target.value })}/></label>
        {user.id && data && hasRole(user.id, 'admin') && <p>Для изменения VK ID сначала снимите роль администратора. Собственный VK ID изменить нельзя.</p>}
        <label>Приватное примечание<textarea maxLength={4000} value={user.note} onChange={e => setUser({ ...user, note: e.target.value })}/></label>
        <button>Сохранить пользователя</button>{user.id && <button type="button" onClick={() => setUser(emptyUser)}>Отмена</button>}
      </form>
      {data?.users.map(u => <article key={u.id}><h3>{u.name}</h3><p>{u.vkontakte_id ? `VK ${u.vkontakte_id}` : 'VK не связан'}{expert(u.id) ? ' · эксперт' : ''}</p><p>{u.note}</p>
        <div className="admin-relation"><label><input type="checkbox" checked={hasRole(u.id, 'attendee')} onChange={e => toggleRole(u, 'attendee', e.target.checked)}/> Участник</label>
          <label><input type="checkbox" checked={hasRole(u.id, 'admin')} disabled={u.id === user_id || !u.vkontakte_id} onChange={e => toggleRole(u, 'admin', e.target.checked)}/> Администратор</label></div>
        {!u.vkontakte_id && <p>Для назначения администратора свяжите VK ID.</p>}
        <button onClick={() => { setUser(u); nameInput.current?.focus(); }}>Изменить пользователя</button> <button disabled={u.id === user_id} onClick={() => { if (window.confirm(`Удалить ${u.name}, профиль эксперта и все связи?`)) mutate('deleteUser', { id: u.id }); }}>Удалить пользователя</button>{' '}
        <button onClick={() => setProfile({ ...(expert(u.id) || emptyProfile), user_id: u.id })}>{expert(u.id) ? 'Изменить профиль эксперта' : 'Создать профиль эксперта'}</button>
        {expert(u.id) && <><button onClick={() => {
          if (data.hosts.some(h => h.user_id === u.id)) { setError('Сначала снимите все назначения ведущего у этого эксперта.'); return; }
          if (window.confirm(`Удалить профиль эксперта ${u.name}?`)) mutate('deleteExpertProfile', { user_id: u.id });
        }}>Удалить профиль эксперта</button>
          {data.events.map(ev => <div className="admin-relation" key={ev.id}><span>{ev.title}</span><label><input type="checkbox" checked={linked('hosts', u.id, ev.id)} onChange={e => mutate('host', { user_id: u.id, event_id: ev.id, enabled: e.target.checked })}/> Ведущий</label></div>)}</>}
      </article>)}
    </fieldset>
    {profile && <fieldset disabled={busy || !data}><legend>Профиль эксперта: {data.users.find(u => u.id === profile.user_id)?.name}</legend><p>Изменения появятся на публичном сайте после экспорта, сборки и публикации.</p>
      <form onSubmit={async e => { e.preventDefault(); if (await mutate('saveExpertProfile', profile)) setProfile(null); }}>
        <label>Портрет<select ref={portraitSelect} value={profile.photo} onChange={e => setProfile({ ...profile, photo: e.target.value })}>{photos.map(photo => <option key={photo} value={photo}>{photo.split('/').pop()}</option>)}</select></label>
        <img className="admin-portrait" src={`${import.meta.env.BASE_URL}${profile.photo}`} alt="Предпросмотр портрета"/>
        <label>Ссылка на профиль (HTTPS)<input required type="url" pattern="https://.*" maxLength={1000} value={profile.profile_url} onChange={e => setProfile({ ...profile, profile_url: e.target.value })}/></label>
        <label>Профессиональное описание<input maxLength={500} value={profile.professional_title} onChange={e => setProfile({ ...profile, professional_title: e.target.value })}/></label>
        <label>Биография<textarea maxLength={10000} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })}/></label>
        <label>Порядок отображения<input required type="number" min="0" max={Number.MAX_SAFE_INTEGER} step="1" value={profile.sort_order} onChange={e => setProfile({ ...profile, sort_order: e.target.value === '' ? '' : Number(e.target.value) })}/></label>
        <button>Сохранить профиль</button><button type="button" onClick={() => setProfile(null)}>Отмена</button>
      </form>
    </fieldset>}
    <fieldset disabled={busy || !data}><legend>События</legend><form onSubmit={async e => { e.preventDefault(); if (await mutate('saveEvent', event)) setEvent(emptyEvent); }}>
      <label>Название<input required maxLength={300} value={event.title} onChange={e => setEvent({ ...event, title: e.target.value })}/></label>
      <label>Описание<textarea maxLength={10000} value={event.description} onChange={e => setEvent({ ...event, description: e.target.value })}/></label><button>Сохранить событие</button>{event.id && <button type="button" onClick={() => setEvent(emptyEvent)}>Отмена</button>}
    </form>{data?.events.map(ev => <article key={ev.id}><h3>{ev.title}</h3><p>{ev.description}</p><button onClick={() => setEvent(ev)}>Изменить</button> <button onClick={() => { if (window.confirm(`Удалить «${ev.title}» и все связи?`)) mutate('deleteEvent', { id: ev.id }); }}>Удалить</button></article>)}</fieldset>
  </main>;
}
