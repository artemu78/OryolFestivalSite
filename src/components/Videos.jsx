import React from "react";
import { Flower } from "./Flower";

const defaultCommunity = "https://vk.ru/club241058655";

export function Videos({ community = defaultCommunity }) {
  return (
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
  );
}

export { Videos as LiveVoices };
