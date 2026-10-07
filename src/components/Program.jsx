import { assetUrl } from '../assetUrl';
import content from "../site.json";
import React, { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { useProgramStack } from "../hooks/useProgramStack";

function formatEventTime(startUs, endUs) {
  if (!startUs) return "";
  const start = new Date(startUs / 1000);
  const startStr = start.toLocaleTimeString("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!endUs) return startStr;
  const end = new Date(endUs / 1000);
  const endStr = end.toLocaleTimeString("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startStr}–${endStr}`;
}

function groupSessions(items) {
  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.time)) groups.set(item.time, []);
    groups.get(item.time).push(item);
  });
  return [...groups].map(([time, items]) => ({ time, items }));
}

export function Program() {
  const { events, hosts, expertProfiles, attendance, loading, dataError } = useData();
  const attendedEventIds = useMemo(
    () => new Set(attendance.map(({ event_id }) => event_id)),
    [attendance],
  );
  const [filter, setFilter] = useState(content.Program.all);

  const sessions = useMemo(() => {
    if (!Array.isArray(events) || events.length === 0) return [];
    const hostsByEvent = new Map();
    if (Array.isArray(hosts)) {
      hosts.forEach(({ event_id, user_id }) => {
        if (!hostsByEvent.has(event_id)) hostsByEvent.set(event_id, []);
        hostsByEvent.get(event_id).push(user_id);
      });
    }

    const sorted = [...events].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

    return sorted.map((ev) => {
      const hostIds = hostsByEvent.get(ev.id) || [];
      const people = hostIds
        .map((uid) => expertProfiles.find((p) => p.user_id === uid))
        .filter(Boolean);

      return {
        id: ev.id,
        time: formatEventTime(ev.time_start, ev.time_end),
        category: ev.category || "Встреча",
        tag: ev.tag || "",
        title: ev.title || "",
        text: ev.description || "",
        location: ev.location || undefined,
        access: ev.access || undefined,
        background: ev.background || undefined,
        people: people.length > 0 ? people : undefined,
      };
    });
  }, [events, hosts]);

  const categories = useMemo(
    () => [
      content.Program.all,
      ...new Set(sessions.map(({ category }) => category).filter(Boolean)),
    ],
    [sessions],
  );

  const visibleSessions = useMemo(
    () =>
      sessions.filter(
        (item) => filter === content.Program.all || item.category === filter,
      ),
    [sessions, filter],
  );

  const groups = useMemo(
    () => groupSessions(visibleSessions),
    [visibleSessions],
  );
  const stackRef = useProgramStack(groups);

  return (
    <section id="program" className="program section">
      <div className="wrap">
        <div className="section-label">{content.Program.label}</div>
        <div className="section-heading">
          <h2>
            {content.Program.title}
            <em>{content.Program.titleEmphasis}</em>
          </h2>
          <p>{content.Program.description}</p>
        </div>
        <div
          className="filters"
          role="group"
          aria-label={content.Program.filtersLabel}
        >
          {categories.map((item) => (
            <button
              key={item}
              aria-pressed={filter === item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
              {item === content.Program.all && <span>{sessions.length}</span>}
            </button>
          ))}
        </div>
        {loading && sessions.length === 0 && (
          <p role="status" className="program-status">
            Загрузка программы…
          </p>
        )}
        {dataError && sessions.length === 0 && (
          <p role="alert" className="program-error">
            {dataError}
          </p>
        )}
        <div className="sessions program-stack" ref={stackRef}>
          {groups.map((group) => (
            <div className="program-group" key={group.time}>
              <div className="program-group-surface">
                <div className="program-group-heading">
                  <strong>{group.time}</strong>
                  {group.items.length > 1 && (
                    <span>
                      {group.time === "14:30–17:30"
                        ? content.Program.appointments
                        : content.Program.parallel}
                    </span>
                  )}
                </div>
                <div
                  className={`program-group-sessions${group.items.length > 1 ? " is-parallel" : ""}`}
                >
                  {group.items.map((item) => (
                    <SessionCard
                      key={item.id || item.title}
                      item={item}
                      index={sessions.indexOf(item)}
                      attended={attendedEventIds.has(item.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="program-note">{content.Program.note}</p>
      </div>
    </section>
  );
}

function SessionCard({ item, index, attended }) {
  return (
    <article className="session">
      {item.background && (
        <div className="session-bg" aria-hidden="true">
          <img
            src={assetUrl(item.background)}
            alt=""
            loading="lazy"
          />
        </div>
      )}
      <div className="session-body">
        <span className="session-tag">{item.tag}</span>
        {attended && (
          <div className="session-attendance">
            <span aria-hidden="true">✓</span>
            {content.Program.attended}
          </div>
        )}
        <h3>{item.title}</h3>
        <p>{item.text}</p>
        <div className="session-people">
          {item.people?.map((person) => (
            <a
              className="session-person"
              key={person.user_id}
              href={person.profile}
              target="_blank"
              rel="noopener"
            >
              <img
                src={assetUrl(person.photo)}
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
          {item.access && <span className="session-access">{item.access}</span>}
        </div>
      </div>
      <span className="session-number">
        {String(index + 1).padStart(2, "0")}
      </span>
    </article>
  );
}
