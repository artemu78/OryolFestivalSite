import content from "../site.json";
import React, { useState } from "react";
import { sessions } from "../program";
import { useProgramStack } from "../hooks/useProgramStack";

const categories = [content.Program.all, ...new Set(sessions.map(({ category }) => category))];

function groupSessions(items) {
  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.time)) groups.set(item.time, []);
    groups.get(item.time).push(item);
  });
  return [...groups].map(([time, items]) => ({ time, items }));
}

export function Program() {
  const [filter, setFilter] = useState(content.Program.all);
  const visibleSessions = sessions.filter(
    (item) => filter === content.Program.all || item.category === filter,
  );

  const groups = groupSessions(visibleSessions);
  const stackRef = useProgramStack(filter);

  return (
    <section id="program" className="program section">
      <div className="wrap">
        <div className="section-label">{content.Program.label}</div>
        <div className="section-heading">
          <h2>
            {content.Program.title}<em>{content.Program.titleEmphasis}</em>
          </h2>
          <p>{content.Program.description}</p>
        </div>
        <div
          className="filters"
          role="group"
          aria-label={content.Program.filtersLabel}
        >
          {categories.map(
            (item) => (
              <button
                key={item}
                aria-pressed={filter === item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
                {item === content.Program.all && <span>{sessions.length}</span>}
              </button>
            ),
          )}
        </div>
        <div className="sessions program-stack" ref={stackRef}>
          {groups.map((group) => (
            <div className="program-group" key={group.time}>
              <div className="program-group-surface">
                <div className="program-group-heading">
                  <strong>{group.time}</strong>
                  {group.items.length > 1 && (
                    <span>{group.time === "14:30–17:30"
                      ? content.Program.appointments
                      : content.Program.parallel}</span>
                  )}
                </div>
                <div className={`program-group-sessions${group.items.length > 1 ? " is-parallel" : ""}`}>
                  {group.items.map((item) => <SessionCard key={item.title} item={item} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="program-note">
          {content.Program.note}
        </p>
      </div>
    </section>
  );
}

function SessionCard({ item }) {
  return (
    <article className="session">
      {item.background && (
        <div className="session-bg" aria-hidden="true">
          <img
            src={`${import.meta.env.BASE_URL}${item.background}`}
            alt=""
            loading="lazy"
          />
        </div>
      )}
      <div className="session-body">
        <span className="session-tag">{item.tag}</span>
        <h3>{item.title}</h3>
        <p>{item.text}</p>
        <div className="session-people">
          {item.people?.map((person) => (
            <a
              className="session-person"
              key={person.id}
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
  );
}
