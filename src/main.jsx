import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const community = 'https://vk.ru/club241058655';
// Fill after agreeing the studio contact with the owner. No invented contact URL.
const studioContact = '';
const sessions = [
  { category: 'Разговоры', tag: 'ПИТАНИЕ И САМОЧУВСТВИЕ', title: 'Как еда связана с нашим умом', name: 'Оксана Воронцова', text: 'О питании, работе мозга, концентрации и ежедневных привычках — без крайностей и универсальных советов.', time: 'Время уточняется', location: 'Большой зал · свободный доступ' },
  { category: 'Практики', tag: 'ДВИЖЕНИЕ И МУЗЫКА', title: 'Танцевать так, как хочется тебе', name: 'Екатерина Анича', text: 'Практика свободного танца с живым DJ-миксом. Можно двигаться, кружиться или просто слушать музыку.', time: '17:30', location: 'Около 1 часа · бесплатная практика' },
];
const experts = [
  { initials: 'НП', name: 'Надежда Павлюшина', role: 'Практикующий психолог', text: 'Разговор о переживаниях, поддержке и том, что значит ментальное здоровье.', className: 'sage', symbol: 'sun' },
  { initials: 'ОВ', name: 'Оксана Воронцова', role: 'Клинический нутрициолог', text: 'Связь питания, образа жизни и когнитивного здоровья.', className: 'peach', symbol: 'leaf' },
  { initials: 'ЕА', name: 'Екатерина Анича', role: 'Танцевально-двигательный терапевт', text: 'Свободный танец, телесные практики и музыка, в которой можно быть собой.', className: 'lavender', symbol: 'wave' },
  { initials: 'ТХ', name: 'Татьяна Хотеева', role: 'Заместитель главного врача Орловского ПНД', text: 'Приглашённый специалист первого фестиваля ментального здоровья.', className: 'sand', symbol: 'orbit' },
];

function Flower({ className = '' }) {
  return <svg className={className} viewBox="0 0 120 120" aria-hidden="true"><g fill="currentColor">{Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="60" cy="31" rx="13" ry="27" transform={`rotate(${i * 45} 60 60)`} />)}<circle cx="60" cy="60" r="21" /></g><circle cx="60" cy="60" r="10" fill="#f7f5ed" /></svg>;
}

function HeroArt() {
  return <div className="hero-art" aria-hidden="true">
    <div className="art-orbit"/><div className="art-arch"/>
    <svg className="plant" viewBox="0 0 430 520"><defs><linearGradient id="leaf" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#244c3c"/><stop offset="1" stopColor="#72966a"/></linearGradient></defs>
      <path d="M211 508 C180 330 277 250 245 75" fill="none" stroke="#244c3c" strokeWidth="5"/>
      <g fill="url(#leaf)"><path d="M230 343C113 349 71 263 81 210c102 1 152 62 149 133Z"/><path d="M222 399c116 19 181-56 184-114-111-17-169 38-184 114Z"/><path d="M247 244C129 235 130 145 139 108c86 23 115 70 108 136Z"/><path d="M252 283c110-9 136-83 129-134-91 13-131 61-129 134Z"/><path d="M246 154C173 127 178 60 196 28c61 25 67 68 50 126Z"/><path d="M247 193c80-16 100-85 81-121-66 21-88 60-81 121Z"/></g>
      <g fill="none" stroke="#bed1a4" strokeWidth="1.5" opacity=".5"><path d="m89 219 137 119M397 295 225 395M145 116l100 122M375 159 255 280M199 37l47 113M324 79l-76 109"/></g>
    </svg>
    <Flower className="hero-flower"/><div className="art-sticker">можно<br/><i>быть собой</i><span>✳</span></div>
    <span className="art-caption">МЕСТО ДЛЯ ТЕБЯ. ВРЕМЯ ДЛЯ СЕБЯ.</span>
  </div>;
}

function App() {
  const [filter, setFilter] = useState('Всё');
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleSessions = sessions.filter(item => filter === 'Всё' || item.category === filter);
  return <>
    <a className="skip-link" href="#main">К содержанию</a>
    <header className="header wrap">
      <a className="brand" href="#" aria-label="Фестиваль ментального здоровья — главная"><Flower/><span>фестиваль<br/>ментального здоровья<span className="brand-city">ОРЁЛ · 2026</span></span></a>
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="navigation">{menuOpen ? 'Закрыть −' : 'Меню +'}</button>
      <nav id="navigation" className={menuOpen ? 'nav open' : 'nav'} aria-label="Основная навигация">{[['О фестивале', '#about'], ['Программа', '#program'], ['Эксперты', '#experts']].map(([label, link]) => <a key={link} href={link} onClick={() => setMenuOpen(false)}>{label}</a>)}<a className="nav-social" href={community} target="_blank" rel="noreferrer">Мы ВКонтакте ↗</a></nav>
    </header>
    <main id="main">
      <section className="hero wrap">
        <div className="hero-copy"><div className="eyebrow"><span className="dot"/> 10 ОКТЯБРЯ 2026 · ОРЁЛ</div><h1>Ближе<br/>к <em>себе.</em></h1><p className="hero-subtitle">Первый фестиваль<br/>ментального здоровья в Орле</p><p className="hero-description">Один день, чтобы замедлиться, услышать себя<br className="desktop-break"/> и поговорить о том, что действительно важно.</p><a className="button" href="#program">Что нас ждёт <span>↗</span></a><div className="hero-note"><span className="small-star">✳</span> В атмосфере уважения и принятия</div></div>
        <HeroArt/>
      </section>
      <div className="event-strip"><div className="wrap strip-inner"><span>10 октября <small>Всемирный день психического здоровья</small></span><span>Орёл <small>Встречаемся в коворкинге</small></span><span>35 участников <small>Камерно. По-человечески.</small></span><span className="strip-flower">✳</span></div></div>
      <section id="about" className="about section wrap"><div className="section-label">01 / О ФЕСТИВАЛЕ</div><div className="about-content"><h2>Не обязательно делать вид,<br/>что <em>«всё нормально».</em></h2><div className="about-columns"><p>Мы создаём пространство, где можно говорить о психическом здоровье простым и понятным языком. Делиться переживаниями, задавать вопросы и лучше понимать себя.</p><p>Вместе с практикующими психологами и приглашёнными экспертами поговорим о поддержке, заботе о себе и ежедневных привычках. Без страха и необходимости соответствовать.</p></div><div className="values"><span>↗ Понятные разговоры</span><span>✳ Бережные практики</span><span>♡ Живое общение</span></div></div></section>
      <section id="program" className="program section"><div className="wrap"><div className="section-label">02 / ПРОГРАММА</div><div className="section-heading"><h2>День <em>для себя.</em></h2><p>Поговорить. Попробовать. Почувствовать.</p></div><div className="filters" role="group" aria-label="Разделы программы">{['Всё', 'Разговоры', 'Практики'].map(item => <button key={item} aria-pressed={filter === item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}{item === 'Всё' && <span>02</span>}</button>)}</div><div className="sessions">{visibleSessions.map((item) => <article className="session" key={item.title}><div className="session-time">{item.time === '17:30' ? <><strong>17:30</strong><span>около 1 часа</span></> : <><strong className="time-tbd">Время<br/>уточняется</strong><span>следите за анонсами</span></>}</div><div className="session-body"><span className="session-tag">{item.tag}</span><h3>{item.title}</h3><p>{item.text}</p><div className="session-meta"><span>{item.name}</span><span>{item.location}</span></div></div><span className="session-number">0{sessions.indexOf(item) + 1}</span></article>)}</div><p className="program-note">Это первые анонсированные события. Полную программу и время начала добавим после уточнения у команды.</p></div></section>
      <section id="experts" className="section experts wrap"><div className="section-label">03 / ЛЮДИ ФЕСТИВАЛЯ</div><div className="section-heading"><h2>Рядом — <em>люди.</em></h2><p>Со знаниями, опытом и вниманием к вам.</p></div><div className="expert-grid">{experts.map(expert => <article className="expert" key={expert.name}><div className={`expert-art ${expert.className}`}><span className="expert-initials">{expert.initials}</span><span className={`expert-symbol ${expert.symbol}`} aria-hidden="true">{expert.symbol === 'sun' ? '✳' : expert.symbol === 'leaf' ? '❧' : expert.symbol === 'wave' ? '≈' : '◎'}</span><span className="expert-art-label">ЗНАКОМИМСЯ БЛИЖЕ</span></div><h3>{expert.name}</h3><span className="expert-role">{expert.role}</span><p>{expert.text}</p></article>)}</div></section>
      <section id="videos" className="video-section wrap"><div className="video-art" aria-hidden="true"><span className="video-orbit"/><Flower/><span className="video-word">услышать<br/><em>друг друга.</em></span></div><div className="video-copy"><div className="section-label">04 / ЖИВЫЕ ГОЛОСА</div><h2>За каждым экспертом —<br/><em>своя история.</em></h2><p>Здесь появятся видеознакомства с участниками команды. А пока — беседы и новости фестиваля в нашем сообществе.</p><a className="text-link" href={community} target="_blank" rel="noreferrer">Заглянуть в сообщество <span>↗</span></a><span className="video-soon">Видеознакомства — скоро</span></div></section>
      <section className="closing wrap"><span className="eyebrow">10 ОКТЯБРЯ · УВИДИМСЯ В ОРЛЕ</span><h2>Приходите <em>собой.</em></h2><p>Без правильных ответов и лишних ожиданий.<br/>Мы рады, что вы проведёте этот день с нами.</p><span className="sold-out">Все 35 мест уже заняты</span><Flower/></section>
    </main>
    <footer className="footer wrap"><div><span>Первый фестиваль ментального здоровья в Орле</span><small>10 октября 2026 · Благотворительная инициатива</small></div><a href={community} target="_blank" rel="noreferrer">ВКонтакте ↗</a>{studioContact ? <a href={studioContact}>Сайт — Студия Артёма Рева ↗</a> : <span className="studio-credit">Сайт — Студия Артёма Рева</span>}</footer>
  </>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
