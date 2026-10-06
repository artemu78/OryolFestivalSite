import { useEffect, useRef } from "react";

// Keep scroll progress outside React rendering; CSS owns the presentation.
export function useProgramStack(sessionGroups) {
  const stackRef = useRef(null);

  useEffect(() => {
    const stack = stackRef.current;
    const groups = [...stack.children];
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let offsets = [];

    function measure() {
      offsets = groups.map((group) => {
        // A tall group pins only after its bottom has entered the viewport.
        const top = Math.min(24, window.innerHeight - group.offsetHeight - 24);
        group.style.setProperty("--stack-top", `${top}px`);
        return top;
      });
      schedule();
    }

    function update() {
      frame = 0;
      const rectangles = groups.map((group) => group.getBoundingClientRect());
      groups.forEach((group, index) => {
        const next = rectangles[index + 1];
        const current = rectangles[index];
        const pinned = current.top <= offsets[index] + 1;
        const overlap = next && pinned ? Math.max(0, current.bottom - next.top) : 0;
        const distance = Math.min(current.height, window.innerHeight * 0.65);
        const progress = motionPreference.matches ? 0 : Math.min(1, overlap / distance);
        group.style.setProperty("--stack-progress", progress);
        const covered = !!next && next.top <= offsets[index + 1] + 1;
        group.toggleAttribute("data-covered", !motionPreference.matches && covered);
      });
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    const observer = new ResizeObserver(measure);
    groups.forEach((group) => observer.observe(group));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    motionPreference.addEventListener("change", measure);
    measure();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      motionPreference.removeEventListener("change", measure);
      groups.forEach((group) => {
        group.style.removeProperty("--stack-top");
        group.style.removeProperty("--stack-progress");
        group.removeAttribute("data-covered");
      });
    };
  }, [sessionGroups]);

  return stackRef;
}
