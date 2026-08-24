import { createDefaultSave, SAVE_VERSION, type SaveData } from './SaveSchema';

const STORAGE_KEY = 'service-rush-save';

export class SaveManager {
  load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultSave();

      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed.saveVersion !== SAVE_VERSION) {
        // Future versions migrate here instead of silently breaking old saves.
        return createDefaultSave();
      }
      return parsed as SaveData;
    } catch {
      return createDefaultSave();
    }
  }

  save(data: SaveData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be unavailable in privacy modes. Gameplay must still continue.
    }
  }
}
