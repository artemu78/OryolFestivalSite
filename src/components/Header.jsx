import React, { useEffect, useRef, useState } from "react";
import "./Header.css";
import { Flower } from "./Flower";

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
  const container = useRef(null);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!open || signedIn) return;
    let active = true;
    let oneTap;
    setStatus("Загрузка VK ID…");
    const onError = (param1, param2) => {
      if (active) console.error("VK ID error:", param1, param2);
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
              let { user_id, expires_in, refresh_token, access_token } =
                await VKID.Auth.exchangeCode(payload.code, payload.device_id);
              if (!active) return;
              const userInfo = await VKID.User.publicInfo(access_token);
              console.log("VK ID user info:", userInfo);
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
  }, [open, signedIn]);

  return (
    <div className="header-login">
      <button
        type="button"
        className="header-login-button"
        aria-expanded={signedIn ? undefined : open}
        aria-controls={signedIn ? undefined : "vk-login-panel"}
        onClick={() => {
          if (signedIn) {
            setSignedIn(false);
            setStatus("");
          } else {
            setOpen(!open);
            setStatus("");
          }
        }}
      >
        {signedIn ? "Выйти" : open ? "Закрыть вход" : "Войти через VK"}
      </button>
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
