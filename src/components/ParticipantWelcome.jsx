import participants from "../participants.json";
import content from "../site.json";
import { useAuth } from "../context/AuthContext";
import "./ParticipantWelcome.css";

export function ParticipantWelcome() {
  const { signedIn, user_id } = useAuth();
  const registered = signedIn && user_id != null && participants.some(
    (participant) => participant.vkontakte_id === String(user_id),
  );

  return (
    <div role="status">
      {registered && (
        <p className="participant-welcome">{content.Header.participantWelcome}</p>
      )}
    </div>
  );
}
