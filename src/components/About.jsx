import React from "react";

export function About() {
  return (
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
  );
}
