import { createContext, useContext, useMemo, useState } from "react";

export const AuthContext = createContext(null);

// Session values stay in memory and are initially unknown.
export function AuthProvider({ children }) {
  const [user_id, setUserId] = useState(null);
  const [expires_in, setExpiresIn] = useState(null);
  const [refresh_token, setRefreshToken] = useState(null);
  const [access_token, setAccessToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const value = useMemo(
    () => ({
      registered,
      setRegistered,
      admin,
      setAdmin,
      user_id,
      expires_in,
      refresh_token,
      access_token,
      userInfo,
      signedIn,
      setSignedIn,
      setUserId,
      setExpiresIn,
      setRefreshToken,
      setAccessToken,
      setUserInfo,
    }),
    [registered, admin, user_id, expires_in, refresh_token, access_token, userInfo, signedIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
