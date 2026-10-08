import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { adminRequest } from "../admin-api";
import { useAuth } from "./AuthContext";

export const DataContext = createContext(null);
const emptyRows = [];

export function DataProvider({ children, initialData }) {
  const { access_token, sessionRevision, isCurrentSession } = useAuth();
  const [events, setEvents] = useState(initialData?.events ?? []);
  const [users, setUsers] = useState(initialData?.users ?? []);
  const [expertProfiles, setExpertProfiles] = useState(
    initialData?.expertProfiles ?? [],
  );
  const [hosts, setHosts] = useState(initialData?.hosts ?? []);
  const [attendance, setAttendance] = useState(initialData?.attendance ?? []);
  const [sponsors, setSponsors] = useState(initialData?.sponsors ?? []);
  const [dataError, setDataError] = useState("");
  const [loading, setLoading] = useState(false);
  // The prerender snapshot belongs only to the initial anonymous session.
  const [loadedRevision, setLoadedRevision] = useState(
    initialData != null ? 0 : null,
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    const current = () =>
      active &&
      (!access_token
        ? sessionRevision === 0
        : isCurrentSession(access_token, sessionRevision));

    // The list action also reads visible Sponsors from YDB.
    adminRequest(access_token, "list")
      .then((result) => {
        if (!current()) return;
        if (!Array.isArray(result?.users) || !Array.isArray(result?.events)) {
          throw new Error("Некорректный ответ сервиса данных");
        }
        setUsers(result.users);
        setEvents(result.events);
        const enhancedProfiles = enhanceExpertProfiles(
          Array.isArray(result.expert_profiles)
            ? result.expert_profiles
            : emptyRows,
          result.users,
        );

        setExpertProfiles(enhancedProfiles);
        setHosts(Array.isArray(result.hosts) ? result.hosts : emptyRows);
        setAttendance(
          Array.isArray(result.attendance) ? result.attendance : emptyRows,
        );
        setSponsors(
          Array.isArray(result.sponsors) ? result.sponsors : emptyRows,
        );
        setLoadedRevision(sessionRevision);
        setDataError("");
      })
      .catch((error) => {
        if (current()) {
          setDataError(error.message || "Не удалось загрузить данные");
        }
      })
      .finally(() => {
        if (current()) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [access_token, sessionRevision, isCurrentSession]);

  // Hide the previous session's rows immediately, before effect cleanup runs.
  const hasCurrentData = loadedRevision === sessionRevision;
  const value = useMemo(
    () => ({
      users: hasCurrentData ? users : emptyRows,
      setUsers,
      events: hasCurrentData ? events : emptyRows,
      setEvents,
      expertProfiles: hasCurrentData ? expertProfiles : emptyRows,
      setExpertProfiles,
      hosts: hasCurrentData ? hosts : emptyRows,
      setHosts,
      attendance: hasCurrentData ? attendance : emptyRows,
      sponsors: hasCurrentData ? sponsors : emptyRows,
      loading,
      dataError,
    }),
    [
      hasCurrentData,
      users,
      events,
      expertProfiles,
      hosts,
      attendance,
      sponsors,
      loading,
      dataError,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === null)
    throw new Error("useData must be used within a DataProvider");
  return context;
}

function enhanceExpertProfiles(expertProfiles, users) {
  const usersById = Object.fromEntries(users.map((user) => [user.id, user]));
  return expertProfiles.map((profile) => {
    const user = usersById[profile.user_id];
    return {
      ...profile,
      name: user?.name || profile.name || "Неизвестный эксперт",
    };
  });
}
