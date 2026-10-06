import content from "../site.json";
import { useAuth } from "../context/AuthContext";
import "./ParticipantWelcome.css";

const calendarParams = new URLSearchParams({
  action: "TEMPLATE",
  text: content.metadata.title,
  dates: `${content.calendar.start}/${content.calendar.end}`,
  stz: content.calendar.timeZone,
  etz: content.calendar.timeZone,
  location: `${content.venue.name}, ${content.venue.address}`,
  details: `${content.metadata.description}\n${content.links.community}`,
});
const calendarUrl = `https://calendar.google.com/calendar/r/eventedit?${calendarParams}`;

export function ParticipantWelcome() {
  const { signedIn, attendee } = useAuth();

  return (
    <div role="status">
      {signedIn && attendee && (
        <p className="participant-welcome">
          {content.Header.participantWelcome}{" "}
          <a className="participant-welcome-calendar" href={calendarUrl} target="_blank" rel="noopener noreferrer">
            {content.calendar.linkLabel}
          </a>
          {" · "}
          <a className="participant-welcome-calendar" href={`${import.meta.env.BASE_URL}festival-2026.ics`}>
            {content.calendar.appleLinkLabel}
          </a>
        </p>
      )}
    </div>
  );
}
