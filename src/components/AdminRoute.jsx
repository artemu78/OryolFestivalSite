import { Component, lazy, Suspense } from "react";
import content from "../site.json";

const text = content.AdminRoute;

const Admin = lazy(() =>
  import("./Admin").then((module) => ({ default: module.Admin })),
);

class AdminLoadBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main id="main" className="wrap">
          <h1>{text.title}</h1>
          <p role="alert">{text.loadError}</p>
          <p>{text.retryHint}</p>
          {/* Reload also recovers chunks replaced by a newer deployment and
              clears the browser's cached rejected dynamic import. */}
          <button type="button" onClick={() => window.location.reload()}>
            {text.retry}
          </button>{" "}
          <a href="#">{text.back}</a>
        </main>
      );
    }
    return this.props.children;
  }
}

export function AdminRoute() {
  return (
    <AdminLoadBoundary>
      <Suspense
        fallback={
          <main id="main" className="wrap" aria-busy="true">
            <h1>{text.title}</h1>
            <p role="status">{text.loading}</p>
            <a href="#">{text.back}</a>
          </main>
        }
      >
        <Admin />
      </Suspense>
    </AdminLoadBoundary>
  );
}
