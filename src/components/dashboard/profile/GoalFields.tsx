"use client";

import { DirectionPicker, InterestPicker } from "../goals/GoalPickers";
import { DestinationPicker } from "../goals/DestinationPicker";
import { INTERESTS } from "@/lib/dashboard/options";
import type { Direction, MemberProfile } from "@/lib/dashboard/types";
import { labelClass } from "../ui";

export function GoalFields({ profile, set }: { profile: MemberProfile; set: (patch: Partial<MemberProfile>) => void }) {
  const chooseDirection = (d: Direction) =>
    set({ direction: d, interests: profile.interests.filter((i) => INTERESTS[d].includes(i)) });

  return (
    <div className="space-y-6">
      <div>
        <p id="goal-destination-label" className={labelClass}>Destinations</p>
        <DestinationPicker
          labelId="goal-destination-label"
          codes={profile.destination_countries}
          other={profile.destination_other}
          onChange={({ codes, other }) => set({ destination_countries: codes, destination_other: other })}
        />
      </div>
      <div>
        <p className={labelClass}>Primary direction</p>
        <DirectionPicker value={profile.direction} onChange={chooseDirection} />
      </div>
      {profile.direction && (
        <div>
          <p className={labelClass}>Interests</p>
          <InterestPicker direction={profile.direction} value={profile.interests} onChange={(interests) => set({ interests })} />
        </div>
      )}
    </div>
  );
}
