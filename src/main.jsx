import React, { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { sessions, venue } from "./program";
import { experts } from "./experts";

const community = "https://vk.ru/club241058655";
// Fill after agreeing the studio contact with the owner. No invented contact URL.
const studioContact = "";
function Flower({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <g fill="currentColor">
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse
            key={i}
            cx="60"
            cy="31"
            rx="13"
            ry="27"
            transform={`rotate(${i * 45} 60 60)`}
          />
        ))}
        <circle cx="60" cy="60" r="21" />
      </g>
      <circle cx="60" cy="60" r="10" fill="#f7f5ed" />
    </svg>
  );
}

function HeroMedia() {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const poster = `${import.meta.env.BASE_URL}girls/1001.png`;

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => setStarted(false));
    } else {
      video.pause();
    }
  }

  return (
    <>
      <div className="hero-media" aria-hidden="true">
        <img className="hero-poster" src={poster} alt="" fetchPriority="high" />
        <video
          ref={videoRef}
          className={`hero-video${started ? " is-playing" : ""}`}
          src={`${import.meta.env.BASE_URL}girls/gemini_generated_video_4ba23423.mp4`}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onPlaying={() => {
            setStarted(true);
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onError={() => {
            setStarted(false);
            setPlaying(false);
          }}
        />
      </div>
      {started && (
        <button
          className="hero-playback"
          onClick={togglePlayback}
          aria-label={
            playing ? "Приостановить фоновое видео" : "Продолжить фоновое видео"
          }
        >
          {playing ? "Ⅱ Пауза" : "▷ Продолжить"}
        </button>
      )}
    </>
  );
}

function App() {
  const [filter, setFilter] = useState("Всё");
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleSessions = sessions.filter(
    (item) => filter === "Всё" || item.category === filter,
  );
  return (
    <>
      <a className="skip-link" href="#main">
        К содержанию
      </a>
      <header className="header wrap">
        <a
          className="brand"
          href="#"
          aria-label="Фестиваль ментального здоровья — главная"
        >
          <Flower />
          <span>
            фестиваль
            <br />
            ментального здоровья<span className="brand-city">ОРЁЛ · 2026</span>
          </span>
        </a>
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="navigation"
        >
          {menuOpen ? "Закрыть −" : "Меню +"}
        </button>
        <nav
          id="navigation"
          className={menuOpen ? "nav open" : "nav"}
          aria-label="Основная навигация"
        >
          {[
            ["О фестивале", "#about"],
            ["Программа", "#program"],
            ["Эксперты", "#experts"],
          ].map(([label, link]) => (
            <a key={link} href={link} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <a
            className="nav-social"
            href={community}
            target="_blank"
            rel="noreferrer"
          >
            Мы ВКонтакте ↗
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero hero-with-media wrap">
          <HeroMedia />
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="dot" /> 10 ОКТЯБРЯ 2026 · 11:30–18:30 · ОРЁЛ
            </div>
            <h1>
              Ближе
              <br />к <em>себе.</em>
            </h1>
            <p className="hero-subtitle">
              Первый фестиваль
              <br />
              ментального здоровья в Орле
            </p>
            <p className="hero-description">
              Один день, чтобы замедлиться, услышать себя
              <br className="desktop-break" /> и поговорить о том, что
              действительно важно.
            </p>
            <a className="button" href="#program">
              Что нас ждёт <span>↗</span>
            </a>
            <div className="hero-note">
              <span className="small-star">✳</span> В атмосфере уважения и
              принятия
            </div>
          </div>
        </section>
        <div className="event-strip">
          <div className="wrap strip-inner">
            <span>
              10 октября{" "}
              <small>11:30–18:30 · Всемирный день психического здоровья</small>
            </span>
            <span>
              <a href={venue.website} target="_blank" rel="noreferrer">
                Freedom ↗
              </a>
              <small>{venue.address}</small>
            </span>
            <span>
              35 участников <small>Камерно. По-человечески.</small>
            </span>
            <span className="strip-flower">✳</span>
          </div>
        </div>
        <section id="about" className="about section wrap">
          <div className="section-label">01 / О ФЕСТИВАЛЕ</div>
          <div className="about-content">
            <h2>
              Не обязательно делать вид,
              <br />
              что <em>«всё нормально».</em>
            </h2>
            <div className="about-columns">
              <p>
                Мы создаём пространство, где можно говорить о психическом
                здоровье простым и понятным языком. Делиться переживаниями,
                задавать вопросы и лучше понимать себя.
              </p>
              <p>
                Вместе с практикующими психологами и приглашёнными экспертами
                поговорим о поддержке, заботе о себе и ежедневных привычках. Без
                страха и необходимости соответствовать.
              </p>
            </div>
            <div className="values">
              <span>↗ Понятные разговоры</span>
              <span>✳ Бережные практики</span>
              <span>♡ Живое общение</span>
            </div>
          </div>
        </section>
        <section id="program" className="program section">
          <div className="wrap">
            <div className="section-label">02 / ПРОГРАММА</div>
            <div className="section-heading">
              <h2>
                День <em>для себя.</em>
              </h2>
              <p>Поговорить. Попробовать. Почувствовать.</p>
            </div>
            <div
              className="filters"
              role="group"
              aria-label="Разделы программы"
            >
              {["Всё", ...new Set(sessions.map(session => session.category))].map((item) => (
                <button
                  key={item}
                  aria-pressed={filter === item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                  {item === "Всё" && <span>{sessions.length}</span>}
                </button>
              ))}
            </div>
            <div className="sessions">
              {visibleSessions.map((item) => (
                <article className="session" key={item.title}>
                  {item.background && (
                    <div className="session-bg" aria-hidden="true">
                      <img
                        src={`${import.meta.env.BASE_URL}${item.background}`}
                        alt=""
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="session-time">
                    <strong>{item.time}</strong>
                  </div>
                  <div className="session-body">
                    <span className="session-tag">{item.tag}</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <div className="session-people">
                      {item.people?.map((person) => (
                        <a
                          className="session-person"
                          key={person.profile}
                          href={person.profile}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={`${import.meta.env.BASE_URL}${person.photo}`}
                            alt={person.name}
                            loading="lazy"
                            width="48"
                            height="48"
                          />
                          <span>{person.name} ↗</span>
                        </a>
                      ))}
                    </div>
                    <div className="session-meta">
                      {item.location && <span>{item.location}</span>}
                      {item.access && (
                        <span className="session-access">{item.access}</span>
                      )}
                    </div>
                  </div>
                  <span className="session-number">
                    {String(sessions.indexOf(item) + 1).padStart(2, "0")}
                  </span>
                </article>
              ))}
            </div>
            <p className="program-note">
              С 14:30 до 17:30 события проходят параллельно в разных залах.
              Индивидуальные сессии, массаж и круглые столы в Синей переговорной
              — по предварительной записи. Число мест указано для формата и не
              означает наличие свободных мест.
            </p>
          </div>
        </section>
        <section id="experts" className="section experts wrap">
          <div className="section-label">03 / ЛЮДИ ФЕСТИВАЛЯ</div>
          <div className="section-heading">
            <h2>
              Рядом — <em>люди.</em>
            </h2>
            <p>Со знаниями, опытом и вниманием к вам.</p>
          </div>
          <div className="expert-grid">
            {experts.map((expert) => (
              <article className="expert" key={expert.name}>
                <div className="expert-art">
                  <a
                    className="expert-photo-link"
                    href={expert.profile}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Профиль ${expert.name} ВКонтакте`}
                  >
                    <img
                      className="expert-photo"
                      src={`${import.meta.env.BASE_URL}${expert.photo}`}
                      alt={expert.name}
                      loading="lazy"
                    />
                  </a>
                </div>
                <h3>
                  <a href={expert.profile} target="_blank" rel="noreferrer">
                    {expert.name} ↗
                  </a>
                </h3>
                <span className="expert-role">{expert.role}</span>
                <p>{expert.text}</p>
                <a
                  className="expert-profile"
                  href={expert.profile}
                  target="_blank"
                  rel="noreferrer"
                >
                  Профиль ВКонтакте ↗
                </a>
              </article>
            ))}
          </div>
        </section>
        <section id="videos" className="video-section wrap">
          <div className="video-art" aria-hidden="true">
            <span className="video-orbit" />
            <Flower />
            <span className="video-word">
              услышать
              <br />
              <em>друг друга.</em>
            </span>
          </div>
          <div className="video-copy">
            <div className="section-label">04 / ЖИВЫЕ ГОЛОСА</div>
            <h2>
              За каждым экспертом —<br />
              <em>своя история.</em>
            </h2>
            <p>
              Здесь появятся видеознакомства с участниками команды. А пока —
              беседы и новости фестиваля в нашем сообществе.
            </p>
            <a
              className="text-link"
              href={community}
              target="_blank"
              rel="noreferrer"
            >
              Заглянуть в сообщество <span>↗</span>
            </a>
            <span className="video-soon">Видеознакомства — скоро</span>
          </div>
        </section>
        <section id="location" className="venue section wrap">
          <div className="section-label">05 / МЕСТО ВСТРЕЧИ</div>
          <h2>
            Встречаемся в <em>Freedom.</em>
          </h2>
          <div className="address">
            <div>
              <p>{venue.address}</p>
              <p>
                10 октября 2026 · 11:30–18:30
                <br />
                Закрытие фестиваля — в 18:30
              </p>
              <div className="venue-links">
                <a
                  className="text-link"
                  href={venue.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  Сайт коворкинга ↗
                </a>
                <a
                  className="text-link"
                  href={venue.community}
                  target="_blank"
                  rel="noreferrer"
                >
                  Freedom ВКонтакте ↗
                </a>
              </div>
            </div>
            <iframe
              src="https://yandex.ru/map-widget/v1/?um=constructor%3Ad9b0866f6fc55a63242665dd7cd776c346beb9b7bf3dc7fc423909b9b01ccf74&amp;source=constructor"
              width="640"
              height="480"
              frameBorder="0"
            ></iframe>
          </div>
        </section>
        <section className="closing wrap">
          <span className="eyebrow">10 ОКТЯБРЯ · УВИДИМСЯ В ОРЛЕ</span>
          <h2>
            Приходите <em>собой.</em>
          </h2>
          <p>
            Без правильных ответов и лишних ожиданий.
            <br />
            Мы рады, что вы проведёте этот день с нами.
          </p>
          <span className="sold-out">Все 35 мест уже заняты</span>
          <Flower />
        </section>
      </main>
      <footer className="footer wrap">
        <div>
          <span>Первый фестиваль ментального здоровья в Орле</span>
          <small>10 октября 2026 · Благотворительная инициатива</small>
        </div>
        <a href={community} target="_blank" rel="noreferrer">
          ВКонтакте ↗
        </a>
        {studioContact ? (
          <a href={studioContact}>Сайт — Студия Артёма Рева ↗</a>
        ) : (
          <span className="studio-credit">Сайт — Студия Артёма Рева</span>
        )}
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
