import content from "../site.json";
import { useAuth } from "../context/AuthContext";
import "./ParticipantWelcome.css";

export function ParticipantWelcome() {
  const { signedIn, attendee } = useAuth();

  return (
    <div role="status">
      {signedIn && attendee && (
        <p className="participant-welcome">{content.Header.participantWelcome}</p>
      )}
    </div>
  );
}
