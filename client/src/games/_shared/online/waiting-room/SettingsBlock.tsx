import { useTranslation } from "react-i18next";
import "./WaitingRoom.css";

type SelectOption = { value: number | string; label: string };

export type SettingField =
  | {
      key: string;
      label: string;
      type: "select";
      value: number | string;
      options: SelectOption[];
      onChange: (value: number | string) => void;
      disabled?: boolean;
      readOnlyValue?: string;
    }
  | {
      key: string;
      label: string;
      type: "number";
      value: number;
      min?: number;
      max?: number;
      step?: number;
      onChange: (value: number) => void;
      disabled?: boolean;
      readOnlyValue?: string;
    }
  | {
      key: string;
      label: string;
      type: "toggle";
      value: boolean;
      onChange: (value: boolean) => void;
      disabled?: boolean;
      readOnlyValue?: string;
    };

type Props = {
  isHost: boolean;
  fields: SettingField[];
  titleKey?: string; // default: common.labels.settings
};

function coerceSelectValue(
  raw: string,
  options: SelectOption[],
): number | string {
  // DOM gives string, so we re-match against options to restore number when needed
  const found = options.find((o) => String(o.value) === raw);
  if (!found) return raw;

  return typeof found.value === "number" ? found.value : found.value;
}

export default function SettingsBlock({
  isHost,
  fields,
  titleKey = "common.labels.settings",
}: Props) {
  const { t } = useTranslation();

  if (!fields || fields.length === 0) return null;

  const renderGuestValue = (f: SettingField) => {
    if (f.type === "toggle") {
      return (
        <label className="lobby-toggle">
          <input type="checkbox" checked={f.value} disabled />
          <span className="lobby-toggleTrack">
            <span className="lobby-toggleThumb" />
          </span>
        </label>
      );
    }
    if (typeof f.readOnlyValue === "string") return f.readOnlyValue;

    return String(f.value);
  };

  const renderHostControl = (f: SettingField) => {
    const disabled = !!f.disabled;

    if (f.type === "select") {
      return (
        <select
          value={String(f.value)}
          disabled={disabled}
          onChange={(e) =>
            f.onChange(coerceSelectValue(e.target.value, f.options))
          }
          className="lobby-field lobby-select"
        >
          {f.options.map((opt) => (
            <option
              key={`${f.key}-${String(opt.value)}`}
              value={String(opt.value)}
            >
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (f.type === "number") {
      return (
        <input
          type="number"
          value={f.value}
          min={f.min}
          max={f.max}
          step={f.step}
          disabled={disabled}
          onChange={(e) => f.onChange(Number(e.target.value))}
          className="lobby-field lobby-input"
        />
      );
    }

    // toggle
    return (
      <label className="lobby-toggle">
        <input
          type="checkbox"
          checked={f.value}
          disabled={disabled}
          onChange={(e) => f.onChange(e.target.checked)}
        />
        <span className="lobby-toggleTrack">
          <span className="lobby-toggleThumb" />
        </span>
      </label>
    );
  };

  return (
    <div className="lobby-settingsBlock lobby-commonBlock">
      <div className="lobby-commonTitle lobby-settingsTitle">{t(titleKey)}</div>

      <div className="lobby-settingsBox commonBox">
        <div className="lobby-settingsTable">
          {/* Labels row */}
          <div className="lobby-settingsRow lobby-settingsRow--labels">
            {fields.map((f) => (
              <div key={`label-${f.key}`} className="lobby-settingsCell">
                {f.label}
              </div>
            ))}
          </div>

          {/* Controls row */}
          <div className="lobby-settingsRow lobby-settingsRow--controls">
            {fields.map((f) => (
              <div
                key={`control-${f.key}`}
                className="lobby-settingsCell lobby-settingsCell--control"
              >
                {isHost ? (
                  renderHostControl(f)
                ) : f.type === "toggle" ? (
                  renderGuestValue(f)
                ) : (
                  <div className="lobby-pillValue">{renderGuestValue(f)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
