export interface DebugFlags {
  enabled: boolean;
  showStateLabels: boolean;
  showServiceWindows: boolean;
}

export const debugFlags: DebugFlags = {
  enabled: import.meta.env.DEV,
  showStateLabels: import.meta.env.DEV,
  showServiceWindows: import.meta.env.DEV,
};
