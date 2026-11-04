import React, { useEffect, useRef, useState } from "react";
import photos from "../festival-photos.json";

const source = (name) => `${import.meta.env.BASE_URL}raw_assets/${name}`;

export function FestivalPhotos() {
  const [start, setStart] = useState(0);
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const track = useRef(null);
  const [visible, setVisible] = useState(3);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setVisible(media.matches ? 1 : 3);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const move = (direction) => {
    const element = track.current;
    const step = element.children[1].offsetLeft - element.children[0].offsetLeft;
    const next = Math.max(0, Math.min(photos.length - visible, start + direction * visible));
    element.scrollTo({ left: next * step, behavior: "instant" });
  };
  useEffect(() => {
    if (selected === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current.showModal();
    return () => { document.body.style.overflow = previous; };
  }, [selected]);
  return (
    <section id="photos" className="section wrap festival-photos" aria-labelledby="photos-title">
      <div className="section-label">Воспоминания</div>
      <h2 id="photos-title">Фото прошедшего фестиваля</h2>
      <div className="festival-photos-grid" ref={track} onScroll={() => {
        const element = track.current;
        const step = element.children[1].offsetLeft - element.children[0].offsetLeft;
        setStart(Math.round(element.scrollLeft / step));
      }}>
        {photos.map((name, index) => (
          <button type="button" className="festival-photo" key={name}
            aria-label={`Открыть фото ${index + 1}`} onClick={() => setSelected(name)}>
            <img src={source(name)} alt={`Момент фестиваля — фото ${index + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      <div className="festival-photos-controls">
        <button type="button" disabled={start === 0} onClick={() => move(-1)} aria-label="Предыдущие фотографии">←</button>
        <span aria-live="polite">{visible === 1 ? start + 1 : `${start + 1}–${Math.min(start + visible, photos.length)}`} / {photos.length}</span>
        <button type="button" disabled={start + visible >= photos.length} onClick={() => move(1)} aria-label="Следующие фотографии">→</button>
      </div>
      <dialog ref={dialog} className="festival-photo-dialog" onClose={() => setSelected(null)}
        aria-label="Фотография прошедшего фестиваля" onClick={(event) => { if (event.target === event.currentTarget) dialog.current.close(); }}>
        <button type="button" autoFocus className="festival-photo-close" aria-label="Закрыть фотографию" onClick={() => dialog.current.close()}>×</button>
        {selected && <img src={source(selected)} alt="Фотография прошедшего фестиваля" />}
      </dialog>
    </section>
  );
}
