import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export const AuthContext = createContext(null);

// Credentials and authorization stay in memory. SDK identity is external to Users.
export function AuthProvider({ children }) {
  const [vk_user_id, setVkUserId] = useState(null);
  const [expires_in, setExpiresIn] = useState(null);
  const [refresh_token, setRefreshToken] = useState(null);
  const [access_token, updateAccessToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [signedIn, updateSignedIn] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [roleError, setRoleError] = useState("");
  const session = useRef({ token: null, signedIn: false, revision: 0 });
  const setAccessToken = useCallback(token => {
    session.current = { ...session.current, token, revision: session.current.revision + 1 };
    setIdentity(null); setRoleError(""); updateAccessToken(token);
  }, []);
  const setSignedIn = useCallback(value => {
    session.current = { ...session.current, signedIn: value, revision: session.current.revision + 1 };
    if (!value) { setIdentity(null); setRoleError(""); }
    updateSignedIn(value);
  }, []);
  const sessionRevision = session.current.revision;
  const isCurrentSession = useCallback((token, revision) =>
    session.current.signedIn && session.current.token === token && session.current.revision === revision, []);
  const me = signedIn && identity?.token === access_token && identity?.revision === sessionRevision ? identity.me : null;
  const value = useMemo(() => ({
    vk_user_id, setVkUserId, expires_in, setExpiresIn, refresh_token, setRefreshToken,
    access_token, setAccessToken, userInfo, setUserInfo, signedIn, setSignedIn,
    sessionRevision, isCurrentSession, setIdentity, roleError, setRoleError,
    user_id: me?.user_id ?? null, attendee: me?.attendee === true,
    admin: me?.admin === true, expert: me?.expert === true,
  }), [vk_user_id, expires_in, refresh_token, access_token, userInfo, signedIn,
    sessionRevision, isCurrentSession, setAccessToken, setSignedIn, roleError, me]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
