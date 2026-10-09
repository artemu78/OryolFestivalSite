import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { adminApiUrl, adminRequest } from "../admin-api";

export function AdminAccess() {
  const {
    access_token,
    signedIn,
    sessionRevision,
    isCurrentSession,
    setIdentity,
    setRoleError,
  } = useAuth();
  useEffect(() => {
    let active = true;
    if (signedIn && access_token && adminApiUrl) {
      adminRequest(access_token, "me")
        .then((me) => {
          if (active && isCurrentSession(access_token, sessionRevision))
            setIdentity({ token: access_token, revision: sessionRevision, me });
        })
        .catch((error) => {
          if (active && isCurrentSession(access_token, sessionRevision))
            setRoleError(error.message);
        });
    }
    return () => {
      active = false;
    };
  }, [
    signedIn,
    access_token,
    sessionRevision,
    isCurrentSession,
    setIdentity,
    setRoleError,
  ]);
  return null;
}

