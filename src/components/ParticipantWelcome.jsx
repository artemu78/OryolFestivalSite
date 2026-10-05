import content from "../site.json";
import { useAuth } from "../context/AuthContext";
import "./ParticipantWelcome.css";

export function ParticipantWelcome() {
  const { signedIn, registered } = useAuth();

  return (
    <div role="status">
      {signedIn && registered && (
        <p className="participant-welcome">{content.Header.participantWelcome}</p>
      )}
    </div>
  );
}
