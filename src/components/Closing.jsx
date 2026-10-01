import React from "react";
import { Flower } from "./Flower";

export function Closing() {
  return (
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
  );
}
