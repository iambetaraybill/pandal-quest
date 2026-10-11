"use client";

import { LocateFixed, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";
import { GROUP_LABEL, INTEREST_LABEL, TOLERANCE_LABEL } from "@/components/planner/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PUJA_DAYS } from "@/lib/data/calendar";
import { PANDAL_BY_ID, PANDALS } from "@/lib/data/pandals";
import { PLACES } from "@/lib/data/places";
import { formatDuration } from "@/lib/engine/time";
import {
  CROWD_TOLERANCES,
  GROUPS,
  INTERESTS,
  type CrowdTolerance,
  type Group,
  type Interest,
  type PujaDayId,
  type TripIntent,
} from "@/lib/types";

const DURATIONS = [60, 90, 120, 150, 180, 240, 300, 360];
const chip =
  "h-7 rounded-full border border-input px-3 text-[13px] aria-pressed:border-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</span>
      {children}
    </div>
  );
}

interface Props {
  intent: TripIntent;
  onChange: (next: TripIntent) => void;
  onLocate: () => void;
  locating: boolean;
  disabled?: boolean;
}

export function IntentEditor({ intent, onChange, onLocate, locating, disabled }: Props) {
  const set = (patch: Partial<TripIntent>) => onChange({ ...intent, ...patch });
  const dayItems = PUJA_DAYS.map((d) => ({ value: d.id, label: `${d.label} · ${d.weekday} ${Number(d.date.slice(8))} Oct` }));
  const placeItems = [
    ...(intent.startCoords ? [{ value: "here", label: "Your location" }] : []),
    ...PLACES.map((p) => ({ value: p.id, label: p.name })),
  ];
  const mustSeeOptions = PANDALS.filter((p) => !intent.mustSee.includes(p.id));

  return (
    <fieldset disabled={disabled} className="grid gap-4 disabled:opacity-60">
      <Row label="When">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Select
            value={intent.day}
            items={dayItems}
            onValueChange={(v) => v && set({ day: v as PujaDayId })}
          >
            <SelectTrigger className="w-full" aria-label="Puja day">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dayItems.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="time"
            step={900}
            aria-label="Start time"
            className="w-28 tabular"
            value={intent.startTime}
            onChange={(e) => /^\d{2}:\d{2}$/.test(e.target.value) && set({ startTime: e.target.value })}
          />
        </div>
        <Select
          value={String(intent.durationMinutes)}
          items={DURATIONS.map((m) => ({ value: String(m), label: `For ${formatDuration(m)}` }))}
          onValueChange={(v) => v && set({ durationMinutes: Number(v) })}
        >
          <SelectTrigger className="w-full" aria-label="How long">
            <SelectValue>{(v: string) => `For ${formatDuration(Number(v))}`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DURATIONS.map((m) => (
              <SelectItem key={m} value={String(m)}>
                For {formatDuration(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>

      <Row label="Start from">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Select
            value={intent.startCoords ? "here" : intent.startPlaceId}
            items={placeItems}
            onValueChange={(v) => v && v !== "here" && set({ startPlaceId: v as string, startCoords: null })}
          >
            <SelectTrigger className="w-full min-w-0" aria-label="Start place">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {placeItems.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={onLocate} disabled={locating} className="h-8">
            {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
            <span className="hidden sm:inline">Near me</span>
          </Button>
        </div>
      </Row>

      <Row label="Who's coming">
        <ToggleGroup
          value={[intent.group]}
          onValueChange={(v) => v[0] && set({ group: v[0] as Group })}
          className="flex-wrap gap-1.5"
          spacing={1.5}
        >
          {GROUPS.map((g) => (
            <ToggleGroupItem key={g} value={g} className={chip}>
              {GROUP_LABEL[g]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Row>

      <Row label="Into">
        <ToggleGroup
          multiple
          value={intent.interests}
          onValueChange={(v) => set({ interests: v as Interest[] })}
          className="flex-wrap gap-1.5"
          spacing={1.5}
        >
          {INTERESTS.map((i) => (
            <ToggleGroupItem key={i} value={i} className={chip}>
              {INTEREST_LABEL[i]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Row>

      <Row label="Queues">
        <ToggleGroup
          value={[intent.crowdTolerance]}
          onValueChange={(v) => v[0] && set({ crowdTolerance: v[0] as CrowdTolerance })}
          className="flex-wrap gap-1.5"
          spacing={1.5}
        >
          {CROWD_TOLERANCES.map((c) => (
            <ToggleGroupItem key={c} value={c} className={chip}>
              {TOLERANCE_LABEL[c]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Row>

      <Row label="Must see">
        <div className="flex flex-wrap gap-1.5">
          {intent.mustSee.map((id) => (
            <span
              key={id}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-secondary pr-1 pl-3 text-[13px] text-secondary-foreground"
            >
              {PANDAL_BY_ID.get(id)?.name ?? id}
              <button
                type="button"
                className="grid size-5 place-items-center rounded-full hover:bg-foreground/10"
                aria-label={`Remove ${PANDAL_BY_ID.get(id)?.name ?? id}`}
                onClick={() => set({ mustSee: intent.mustSee.filter((m) => m !== id) })}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <Select
            value={null}
            onValueChange={(v) =>
              v && set({ mustSee: [...intent.mustSee, v as string], avoid: intent.avoid.filter((a) => a !== v) })
            }
          >
            <SelectTrigger size="sm" className="h-7 rounded-full border-dashed text-[13px]" aria-label="Add a must-see">
              <SelectValue placeholder="Add a pandal" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="max-h-72">
              {mustSeeOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  <span className="text-xs text-muted-foreground">{p.neighbourhood}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Row>
    </fieldset>
  );
}
