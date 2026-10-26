"use client";

import { useEffect } from "react";
import { track, type SiteEvent } from "@/components/site/TrackLink";

/** Records one page view (e.g. visits to /demo). */
export function TrackView({ event }: { event: SiteEvent }) {
  useEffect(() => track(event), [event]);
  return null;
}
