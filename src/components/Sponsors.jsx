import { imageUrl as optimizedImageUrl } from '../imageUrl';
import React from "react";
import content from "../site.json";
import { useData } from "../context/DataContext";

export function webUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function imageUrl(value) {
  const remote = webUrl(value);
  if (remote) return remote;
  if (typeof value !== "string" || !/^logos\/[\w.-]+\.(?:png|jpe?g|webp|svg)$/i.test(value)) return null;
  return optimizedImageUrl(value, 'logo');
}

export function Sponsors() {
  const { sponsors, loading, dataError } = useData();
  const visibleSponsors = sponsors.filter((sponsor) => sponsor.display === true && imageUrl(sponsor.image));
  return (
    <section id="sponsors" className="section sponsors wrap" aria-labelledby="sponsors-title">
      <div className="section-label">{content.Sponsors.label}</div>
      <div className="section-heading">
        <h2 id="sponsors-title">{content.Sponsors.title}</h2>
        <p>{content.Sponsors.description}</p>
      </div>
      {loading ? <p role="status">{content.Sponsors.loading}</p> :
        dataError ? <p role="alert">{content.Sponsors.error}</p> :
        visibleSponsors.length === 0 ? <p>{content.Sponsors.empty}</p> : (
          <ul className="sponsor-grid">
            {visibleSponsors.map(({ id, name, image, link }) => {
              const href = webUrl(link);
              const logo = (
                <div className={`sponsor-logo${image === "logos/braf.jpg" ? " sponsor-logo--screenshot" : ""}`}>
                  <img src={imageUrl(image)} alt={name?.trim() || content.Sponsors.logoLabel} loading="lazy" decoding="async" />
                </div>
              );
              return (
                <li className={`sponsor-card${href ? " sponsor-card--clickable" : ""}`} key={id}>
                  {href ? (
                    <a
                      className="sponsor-link"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name?.trim() || content.Sponsors.linkLabel}
                      title={name?.trim() || href}
                    >
                      {logo}
                    </a>
                  ) : (
                    logo
                  )}
                </li>
              );
            })}
          </ul>
        )}
    </section>
  );
}
