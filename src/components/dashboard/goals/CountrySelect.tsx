"use client";

import { useState } from "react";
import { COUNTRY_OPTIONS, OTHER_COUNTRY } from "@/lib/dashboard/options";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { inputClass } from "../ui";

// Country dropdown with "Other" → free text for any country/territory.
export function CountrySelect({
  id,
  value,
  onChange,
  options = COUNTRY_OPTIONS,
  testId = "country-select",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  testId?: string;
}) {
  const [isOther, setIsOther] = useState(value !== "" && !options.includes(value));
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <select
        id={id}
        data-testid={testId}
        value={isOther ? OTHER_COUNTRY : value}
        onChange={(e) => {
          const next = e.target.value;
          setIsOther(next === OTHER_COUNTRY);
          onChange(next === OTHER_COUNTRY ? "" : next);
        }}
        className={inputClass}
      >
        <option value="">{t("onboarding.selectCountry")}</option>
        {options.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
        <option value={OTHER_COUNTRY}>{t("onboarding.other")}</option>
      </select>
      {isOther && (
        <input
          data-testid={`${testId}-other-input`}
          aria-label="Country or territory"
          autoFocus
          value={value}
          maxLength={60}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("onboarding.otherPlaceholder")}
          className={inputClass}
        />
      )}
    </div>
  );
}
