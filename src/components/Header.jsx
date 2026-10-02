import React, { useEffect, useRef, useState } from "react";
import "./Header.css";
import { Flower } from "./Flower";
import { useAuth } from "../context/AuthContext";

const defaultCommunity = "https://vk.ru/club241058655";

let sdkPromise;

function loadVkId() {
  if (window.VKIDSDK) return Promise.resolve(window.VKIDSDK);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@vkid/sdk@2.6.1/dist-sdk/umd/index.js";
      script.async = true;
      script.onload = () => {
        if (window.VKIDSDK) resolve(window.VKIDSDK);
        else reject(new Error("VK ID SDK unavailable"));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error("VK ID SDK failed to load"));
      };
      document.head.appendChild(script);
    }).catch((error) => {
      sdkPromise = undefined;
      throw error;
    });
  }
  return sdkPromise;
}

function VkLogin() {
  const {
    userInfo,
    signedIn,
    setSignedIn,
    userId,
    setUserId,
    setExpiresIn,
    setRefreshToken,
    setAccessToken,
    setUserInfo,
  } = useAuth();
  // console.log("VkLogin userInfo:", userInfo);
  // console.log("VkLogin userId:", userId);

  const container = useRef(null);
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const loginRoot = useRef(null);
  const menuButton = useRef(null);
  const logoutButton = useRef(null);
  const [status, setStatus] = useState("");
  const avatar = userInfo?.user?.avatar ?? userInfo?.avatar;

  useEffect(() => {
    if (!userMenuOpen || !signedIn) return;
    logoutButton.current?.focus();
    const onPointerDown = (event) => {
      if (!loginRoot.current?.contains(event.target)) setUserMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen, signedIn]);

  useEffect(() => {
    if (!open || signedIn) return;
    let active = true;
    let oneTap;
    setStatus("Загрузка VK ID…");
    const onError = (param1, param2) => {
      if (!active) return;
      console.error("VK ID error:", param1, param2);
      setStatus("Не удалось войти через VK. Закройте окно и попробуйте снова.");
    };

    loadVkId()
      .then((VKID) => {
        if (!active) return;
        VKID.Config.init({
          app: 54800266,
          redirectUrl: "https://artemu78.github.io/OryolFestivalSite/",
          responseMode: VKID.ConfigResponseMode.Callback,
          source: VKID.ConfigSource.LOWCODE,
          scope: "",
        });
        oneTap = new VKID.OneTap();
        oneTap
          .render({ container: container.current, showAlternativeLogin: true })
          .on(VKID.WidgetEvents.LOAD, () => {
            if (active) setStatus("");
          })
          .on(VKID.WidgetEvents.ERROR, onError)
          .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
            if (!active) return;
            setStatus("Выполняется вход…");
            try {
              const { user_id, expires_in, refresh_token, access_token } =
                await VKID.Auth.exchangeCode(payload.code, payload.device_id);
              if (!active) return;
              const userInfo = await VKID.Auth.userInfo(access_token);
              if (!active) return;
              setUserId(user_id);
              setExpiresIn(expires_in);
              setRefreshToken(refresh_token);
              setAccessToken(access_token);
              setUserInfo(userInfo);
              setSignedIn(true);
              setOpen(false);
              setStatus("");
            } catch {
              onError();
            }
          });
      })
      .catch(onError);

    return () => {
      active = false;
      oneTap?.close();
    };
  }, [
    open,
    signedIn,
    setUserId,
    setExpiresIn,
    setRefreshToken,
    setAccessToken,
    setUserInfo,
    setSignedIn,
  ]);

  return (
    <div className="header-login" ref={loginRoot}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setUserMenuOpen(false);
      }}
    >
      <button
        ref={menuButton}
        type="button"
        className={`header-login-button${signedIn ? " header-login-button--signed-in" : ""}`}
        aria-label={signedIn ? "Меню пользователя" : undefined}
        aria-expanded={signedIn ? userMenuOpen : open}
        aria-controls={signedIn ? "user-menu-panel" : "vk-login-panel"}
        onClick={() => {
          if (signedIn) {
            setUserMenuOpen(!userMenuOpen);
          } else {
            setOpen(!open);
            setStatus("");
          }
        }}
      >
        {signedIn && avatar && (
          <img
            className="header-login-avatar"
            src={avatar}
            alt=""
            width="50"
            height="50"
          />
        )}
        {signedIn && !avatar && <span aria-hidden="true">●</span>}
        {!signedIn && (open ? "Закрыть вход" : "Войти через VK")}
      </button>
      {signedIn && userMenuOpen && (
        <div id="user-menu-panel" className="header-user-menu">
          <button type="button" ref={logoutButton} onClick={() => {
            setUserId(null);
            setExpiresIn(null);
            setRefreshToken(null);
            setAccessToken(null);
            setUserInfo(null);
            setSignedIn(false);
            setUserMenuOpen(false);
            setOpen(false);
            setStatus("");
            menuButton.current?.focus();
          }}>Выйти</button>
        </div>
      )}
      {open && (
        <div id="vk-login-panel" className="header-login-panel">
          <div ref={container} />
          <p role="status">{status}</p>
        </div>
      )}
      {signedIn && <span role="status">{status}</span>}
    </div>
  );
}

export function Header({ community = defaultCommunity }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header wrap">
      <a
        className="brand"
        href="#"
        aria-label="Фестиваль ментального здоровья — главная"
      >
        <Flower />
        <span>
          фестиваль
          <br />
          ментального здоровья<span className="brand-city">ОРЁЛ · 2026</span>
        </span>
      </a>
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-controls="navigation"
      >
        {menuOpen ? "Закрыть −" : "Меню +"}
      </button>
      <nav
        id="navigation"
        className={menuOpen ? "nav open" : "nav"}
        aria-label="Основная навигация"
      >
        {[
          ["О фестивале", "#about"],
          ["Программа", "#program"],
          ["Эксперты", "#experts"],
        ].map(([label, link]) => (
          <a key={link} href={link} onClick={() => setMenuOpen(false)}>
            {label}
          </a>
        ))}
        <a
          className="nav-social"
          href={community}
          target="_blank"
          rel="noreferrer"
        >
          Мы ВКонтакте ↗
        </a>
        <VkLogin />
      </nav>
    </header>
  );
}
