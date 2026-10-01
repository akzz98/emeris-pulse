import { useCallback, useEffect, useRef, useState } from "react";

export type HistoryNavigateOptions = {
  replace?: boolean;
};

/**
 * Keeps app screen state in sync with the browser path so Back/Forward work.
 * parse/pathFor map between pathname and a screen id.
 */
export function useHistoryPath<T>(
  parse: (pathname: string) => T,
  pathFor: (value: T) => string,
): [T, (value: T, options?: HistoryNavigateOptions) => void] {
  const [value, setValue] = useState<T>(() => parse(window.location.pathname));
  const parseRef = useRef(parse);
  const pathForRef = useRef(pathFor);
  parseRef.current = parse;
  pathForRef.current = pathFor;

  useEffect(() => {
    const onPopState = () => {
      setValue(parseRef.current(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const nextPath = pathForRef.current(value);
    if (window.location.pathname !== nextPath) {
      window.history.replaceState(window.history.state, "", nextPath);
    }
  }, [value]);

  const navigate = useCallback((next: T, options?: HistoryNavigateOptions) => {
    const nextPath = pathForRef.current(next);
    if (window.location.pathname !== nextPath) {
      if (options?.replace) {
        window.history.replaceState({ value: next }, "", nextPath);
      } else {
        window.history.pushState({ value: next }, "", nextPath);
      }
    }
    setValue(next);
  }, []);

  return [value, navigate];
}
