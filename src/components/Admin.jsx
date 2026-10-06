import { assetUrl } from '../assetUrl';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApiUrl, adminRequest } from '../admin-api';
import photos from '../../infra/yandex/admin/allowed-photos.json';
import logos from '../logos.json';
import { imageUrl } from './Sponsors';
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
const emptySponsor = { name: '', image: logos[0] || 'logos/freedom.jpg', link: '', display: true };

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
  const [sponsorModal, setSponsorModal] = useState(null);
  const alive = useRef(true);
  const operation = useRef(false);
  const nameInput = useRef(null);
  const portraitSelect = useRef(null);
  const sponsorNameInput = useRef(null);
  useEffect(() => { if (profile) portraitSelect.current?.focus(); }, [profile?.user_id]);
  useEffect(() => {
    if (!sponsorModal) return;
    sponsorNameInput.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSponsorModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sponsorModal]);
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
  const [activeTab, setActiveTab] = useState('attendance');
  const tabListRef = useRef(null);

  const tabs = [
    { id: 'attendance', label: 'Посещение событий' },
    { id: 'users', label: 'Пользователи и роли' },
    { id: 'events', label: 'События' },
    { id: 'sponsors', label: 'Спонсоры' },
  ];

  const handleTabKeyDown = (e, index) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight') {
      targetIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      targetIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = tabs.length - 1;
    }

    if (targetIndex !== -1) {
      e.preventDefault();
      const targetTab = tabs[targetIndex];
      setActiveTab(targetTab.id);
      const tabButtons = tabListRef.current?.querySelectorAll('[role="tab"]');
      if (tabButtons && tabButtons[targetIndex]) {
        tabButtons[targetIndex].focus();
      }
    }
  };

  return (
    <main id="main" className="wrap admin-page">
      <div className="admin-header">
        <div className="admin-header-title-row">
          <h1>Управление фестивалем</h1>
          <a className="admin-back-link" href="#">На сайт</a>
        </div>
        {error && <p className="admin-alert" role="alert">{error}</p>}
        {busy ? <p className="admin-status" role="status">Сохраняем…</p> : !data ? <p className="admin-status" role="status">Загружаем…</p> : null}
      </div>

      <nav className="admin-nav" aria-label="Разделы панели управления">
        {/* Desktop tab list */}
        <div
          className="admin-tabs"
          role="tablist"
          aria-label="Разделы панели управления"
          ref={tabListRef}
        >
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={`admin-tab-btn${activeTab === tab.id ? ' admin-tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile dropdown */}
        <div className="admin-mobile-nav">
          <label htmlFor="admin-mobile-section-select" className="admin-mobile-nav-label">
            Раздел:
          </label>
          <select
            id="admin-mobile-section-select"
            className="admin-mobile-select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
      </nav>

      {/* Tab Panels */}
      <div
        id="panel-attendance"
        role="tabpanel"
        aria-labelledby="tab-attendance"
        hidden={activeTab !== 'attendance'}
        className="admin-tabpanel"
      >
        <fieldset disabled={busy || !data}>
          <legend>Посещение событий</legend>
          <p id="attendance-help">Отметьте фактическое посещение участником события. Изменения сохраняются автоматически. Снимите отметку, чтобы исправить запись.</p>
          {data && (!data.events.length ? <p>Добавьте события для отметок посещения.</p> : !attendees.length ? <p>Назначьте пользователям роль участника для отметок посещения.</p> :
            <div className="admin-attendance-scroll" role="region" aria-label="Таблица посещения событий" tabIndex={0}>
              <table className="admin-attendance" aria-describedby="attendance-help"><caption>Участники по событиям</caption>
                <thead><tr><th scope="col">Событие</th>{attendees.map(u => <th scope="col" key={u.id}>{u.name}</th>)}</tr></thead>
                <tbody>{data.events.map(ev => <tr key={ev.id}><th scope="row">{ev.title}</th>{attendees.map(u => <td key={u.id}><input type="checkbox" aria-label={`${u.name} — ${ev.title}`} checked={linked('attendance', u.id, ev.id)} onChange={e => mutate('attendance', { user_id: u.id, event_id: ev.id, enabled: e.target.checked })}/></td>)}</tr>)}</tbody>
              </table>
            </div>)}
        </fieldset>
      </div>

      <div
        id="panel-users"
        role="tabpanel"
        aria-labelledby="tab-users"
        hidden={activeTab !== 'users'}
        className="admin-tabpanel"
      >
        <fieldset disabled={busy || !data}>
          <legend>Пользователи и роли</legend>
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
            <img className="admin-portrait" src={assetUrl(profile.photo)} alt="Предпросмотр портрета"/>
            <label>Ссылка на профиль (HTTPS)<input required type="url" pattern="https://.*" maxLength={1000} value={profile.profile_url} onChange={e => setProfile({ ...profile, profile_url: e.target.value })}/></label>
            <label>Профессиональное описание<input maxLength={500} value={profile.professional_title} onChange={e => setProfile({ ...profile, professional_title: e.target.value })}/></label>
            <label>Биография<textarea maxLength={10000} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })}/></label>
            <label>Порядок отображения<input required type="number" min="0" max={Number.MAX_SAFE_INTEGER} step="1" value={profile.sort_order} onChange={e => setProfile({ ...profile, sort_order: e.target.value === '' ? '' : Number(e.target.value) })}/></label>
            <button>Сохранить профиль</button><button type="button" onClick={() => setProfile(null)}>Отмена</button>
          </form>
        </fieldset>}
      </div>

      <div
        id="panel-events"
        role="tabpanel"
        aria-labelledby="tab-events"
        hidden={activeTab !== 'events'}
        className="admin-tabpanel"
      >
        <fieldset disabled={busy || !data}>
          <legend>События</legend>
          <form onSubmit={async e => { e.preventDefault(); if (await mutate('saveEvent', event)) setEvent(emptyEvent); }}>
            <label>Название<input required maxLength={300} value={event.title} onChange={e => setEvent({ ...event, title: e.target.value })}/></label>
            <label>Описание<textarea maxLength={10000} value={event.description} onChange={e => setEvent({ ...event, description: e.target.value })}/></label><button>Сохранить событие</button>{event.id && <button type="button" onClick={() => setEvent(emptyEvent)}>Отмена</button>}
          </form>
          {data?.events.map(ev => <article key={ev.id}><h3>{ev.title}</h3><p>{ev.description}</p><button onClick={() => setEvent(ev)}>Изменить</button> <button onClick={() => { if (window.confirm(`Удалить «${ev.title}» и все связи?`)) mutate('deleteEvent', { id: ev.id }); }}>Удалить</button></article>)}
        </fieldset>
      </div>

      <div
        id="panel-sponsors"
        role="tabpanel"
        aria-labelledby="tab-sponsors"
        hidden={activeTab !== 'sponsors'}
        className="admin-tabpanel"
      >
        <fieldset disabled={busy || !data}>
          <legend>Спонсоры</legend>
          <div className="admin-sponsors-header">
            <p>Управление спонсорами и партнёрами фестиваля. Создание и редактирование открывается во всплывающем окне.</p>
            <button type="button" onClick={() => setSponsorModal({ ...emptySponsor })}>+ Добавить спонсора</button>
          </div>
          {data && (!data.sponsors?.length ? <p>Спонсоры ещё не добавлены.</p> :
            <div className="admin-sponsors-grid">
          {data.sponsors.map(s => {
            const preview = imageUrl(s.image);
            return (
              <article className="admin-sponsor-card" key={s.id}>
                {preview ? (
                  <img
                    className={`admin-sponsor-thumb${s.image === 'logos/braf.jpg' ? ' sponsor-logo--screenshot' : ''}`}
                    src={preview}
                    alt={s.name?.trim() || 'Логотип спонсора'}
                    loading="lazy"
                  />
                ) : (
                  <div className="admin-sponsor-thumb admin-sponsor-thumb--empty">Нет изображения</div>
                )}
                <h4>{s.name?.trim() || <em>Без названия</em>}</h4>
                <p className="admin-sponsor-card-meta"><code>{s.image}</code></p>
                {s.link && (
                  <p className="admin-sponsor-card-meta">
                    <a href={s.link} target="_blank" rel="noreferrer">{s.link}</a>
                  </p>
                )}
                <div className="admin-relation">
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={Boolean(s.display)}
                      onChange={e => mutate('saveSponsor', { ...s, display: e.target.checked })}
                    />
                    <span className={`admin-badge ${s.display ? 'admin-badge--visible' : 'admin-badge--hidden'}`}>
                      {s.display ? 'Отображается' : 'Скрыт'}
                    </span>
                  </label>
                </div>
                <div className="admin-sponsor-card-actions">
                  <button type="button" onClick={() => setSponsorModal({ ...s })}>Изменить</button>
                  <button type="button" onClick={() => {
                    if (window.confirm(`Удалить спонсора «${s.name || s.image}»?`)) mutate('deleteSponsor', { id: s.id });
                  }}>Удалить</button>
                </div>
              </article>
            );
          })}
        </div>)}
        </fieldset>
      </div>
    {sponsorModal && (
      <div className="admin-modal-backdrop" role="presentation" onClick={() => setSponsorModal(null)}>
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sponsor-modal-title"
          onClick={e => e.stopPropagation()}
        >
          <div className="admin-modal-header">
            <h3 id="sponsor-modal-title">{sponsorModal.id ? 'Редактировать спонсора' : 'Новый спонсор'}</h3>
            <button
              type="button"
              className="admin-modal-close"
              onClick={() => setSponsorModal(null)}
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
          <form onSubmit={async e => {
            e.preventDefault();
            const payload = {
              ...sponsorModal,
              name: sponsorModal.name?.trim() || '',
              image: sponsorModal.image?.trim() || '',
              link: sponsorModal.link?.trim() || '',
              display: Boolean(sponsorModal.display),
            };
            if (await mutate('saveSponsor', payload)) setSponsorModal(null);
          }}>
            <label>Название
              <input
                ref={sponsorNameInput}
                maxLength={300}
                value={sponsorModal.name ?? ''}
                onChange={e => setSponsorModal({ ...sponsorModal, name: e.target.value })}
                placeholder="Например: Freedom"
              />
            </label>

            <label>Выбрать из загруженных логотипов
              <select
                value={logos.includes(sponsorModal.image) ? sponsorModal.image : ''}
                onChange={e => {
                  if (e.target.value) setSponsorModal({ ...sponsorModal, image: e.target.value });
                }}
              >
                <option value="">-- Выберите файл логотипа --</option>
                {logos.map(logo => (
                  <option key={logo} value={logo}>{logo.replace('logos/', '')}</option>
                ))}
              </select>
            </label>

            <label>Путь к файлу или URL изображения
              <input
                required
                maxLength={1000}
                value={sponsorModal.image ?? ''}
                onChange={e => setSponsorModal({ ...sponsorModal, image: e.target.value })}
                placeholder="logos/freedom.jpg или https://example.com/logo.png"
              />
            </label>

            {sponsorModal.image && (
              <div className="admin-sponsor-preview">
                <img
                  src={imageUrl(sponsorModal.image) || sponsorModal.image}
                  alt="Предпросмотр логотипа"
                />
              </div>
            )}

            <label>Ссылка (URL сайта или соцсети)
              <input
                type="url"
                maxLength={1000}
                value={sponsorModal.link ?? ''}
                onChange={e => setSponsorModal({ ...sponsorModal, link: e.target.value })}
                placeholder="https://example.com"
              />
            </label>

            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={Boolean(sponsorModal.display)}
                onChange={e => setSponsorModal({ ...sponsorModal, display: e.target.checked })}
              />
              Показывать на сайте (display)
            </label>

            <div className="admin-modal-actions">
              <button>{sponsorModal.id ? 'Сохранить изменения' : 'Создать спонсора'}</button>
              <button type="button" onClick={() => setSponsorModal(null)}>Отмена</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </main>
  );
}
