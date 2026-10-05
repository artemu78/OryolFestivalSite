import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApiUrl, adminRequest } from '../admin-api';
import './Admin.css';

export function AdminAccess() {
  const { access_token, signedIn, setAdmin, setRegistered } = useAuth();
  useEffect(() => {
    let active = true;
    setAdmin(false); setRegistered(false);
    if (signedIn && access_token && adminApiUrl) {
      adminRequest(access_token, 'me').then(me => { if (active) { setAdmin(me.admin); setRegistered(me.registered); } }).catch(() => {});
    }
    return () => { active = false; };
  }, [signedIn, access_token, setAdmin, setRegistered]);
  return null;
}

export function Admin() {
  const { admin, signedIn, access_token, setAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [participant, setParticipant] = useState({ vkontakte_id: '', note: '', admin: false });
  const [event, setEvent] = useState({ title: '', description: '' });
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    if (admin) adminRequest(access_token, 'list').then(result => { if (active) setData(result); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [admin, access_token]);
  async function mutate(action, values) {
    setBusy(true); setError('');
    try {
      await adminRequest(access_token, action, values);
      setData(await adminRequest(access_token, 'list'));
      return true;
    } catch (err) { setError(err.message); return false; }
    finally { setBusy(false); }
  }
  if (!signedIn) return <main id="main" className="wrap admin-page"><h1>Администрирование</h1><p>Войдите через VK в меню сайта.</p><a href="#">На сайт</a></main>;
  if (!admin) return <main id="main" className="wrap admin-page"><h1>Администрирование</h1><p>{adminApiUrl ? 'Доступ предоставляется администраторам фестиваля.' : 'Сервис управления ещё не настроен.'}</p><a href="#">На сайт</a></main>;
  const linked = (type, pid, eid) => data[type].some(row => row.vkontakte_id === pid && row.event_id === eid);
  return <main id="main" className="wrap admin-page"><h1>Управление фестивалем</h1><a href="#">На сайт</a>
    <p role="alert">{error}</p><p role="status">{busy ? 'Сохраняем…' : !data ? 'Загружаем…' : ''}</p>
    <fieldset disabled={busy || !data}><legend>Участники</legend>
      <form onSubmit={async e => { e.preventDefault(); if (await mutate('saveParticipant', participant)) setParticipant({vkontakte_id:'',note:'',admin:false}); }}>
        <label>VK ID<input required inputMode="numeric" pattern="[0-9]+" value={participant.vkontakte_id} onChange={e => setParticipant({...participant,vkontakte_id:e.target.value})}/></label>
        <label>Примечание<textarea maxLength={4000} value={participant.note} onChange={e => setParticipant({...participant,note:e.target.value})}/></label>
        <label><input type="checkbox" checked={participant.admin} onChange={e => setParticipant({...participant,admin:e.target.checked})}/> Администратор</label><button>Сохранить участника</button>
      </form>
      {data?.participants.map(p => <article key={p.vkontakte_id}><h3>VK {p.vkontakte_id}{p.admin ? ' · администратор' : ''}</h3><p>{p.note}</p>
        <button onClick={() => setParticipant(p)}>Изменить</button> <button onClick={() => { if (window.confirm(`Удалить участника ${p.vkontakte_id} и все его связи?`)) mutate('deleteParticipant',p); }}>Удалить</button>
        {data.events.map(ev => <div className="admin-relation" key={ev.id}><span>{ev.title}</span>
          <label><input type="checkbox" checked={linked('attendance',p.vkontakte_id,ev.id)} onChange={e => mutate('attendance',{vkontakte_id:p.vkontakte_id,event_id:ev.id,enabled:e.target.checked})}/> Посетил</label>
          <label><input type="checkbox" checked={linked('hosts',p.vkontakte_id,ev.id)} onChange={e => mutate('host',{vkontakte_id:p.vkontakte_id,event_id:ev.id,enabled:e.target.checked})}/> Ведущий</label></div>)}
      </article>)}
    </fieldset>
    <fieldset disabled={busy || !data}><legend>События</legend><form onSubmit={async e => { e.preventDefault(); if (await mutate('saveEvent',event)) setEvent({title:'',description:''}); }}>
      <label>Название<input required maxLength={300} value={event.title} onChange={e => setEvent({...event,title:e.target.value})}/></label>
      <label>Описание<textarea maxLength={10000} value={event.description} onChange={e => setEvent({...event,description:e.target.value})}/></label><button>Сохранить событие</button>{event.id && <button type="button" onClick={() => setEvent({title:'',description:''})}>Отмена</button>}
    </form>{data?.events.map(ev => <article key={ev.id}><h3>{ev.title}</h3><p>{ev.description}</p><button onClick={() => setEvent(ev)}>Изменить</button> <button onClick={() => { if(window.confirm(`Удалить «${ev.title}» и все связи?`)) mutate('deleteEvent',ev); }}>Удалить</button></article>)}</fieldset>
  </main>;
}
