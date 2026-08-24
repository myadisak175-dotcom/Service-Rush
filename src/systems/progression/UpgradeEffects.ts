import type { DayConfig } from '../../content/types';
import { upgrades } from '../../content/upgrades';

export interface AppliedUpgradeSummary {
  serviceWindowSeconds: number;
  kitchenCapacity: number;
  waitingGroupLimit: number;
}

export function applyOwnedUpgrades(
  config: DayConfig,
  ownedUpgradeIds: readonly string[],
): DayConfig {
  const summary = summarizeUpgradeEffects(ownedUpgradeIds);

  return {
    ...config,
    serviceWindowSeconds: config.serviceWindowSeconds + summary.serviceWindowSeconds,
    kitchenCapacity: config.kitchenCapacity + summary.kitchenCapacity,
    waitingGroupLimit: config.waitingGroupLimit + summary.waitingGroupLimit,
  };
}

export function summarizeUpgradeEffects(
  ownedUpgradeIds: readonly string[],
): AppliedUpgradeSummary {
  const owned = new Set(ownedUpgradeIds);
  const summary: AppliedUpgradeSummary = {
    serviceWindowSeconds: 0,
    kitchenCapacity: 0,
    waitingGroupLimit: 0,
  };

  for (const upgrade of upgrades) {
    if (!owned.has(upgrade.id) || !upgrade.effect) continue;
    summary.serviceWindowSeconds += upgrade.effect.serviceWindowSeconds ?? 0;
    summary.kitchenCapacity += upgrade.effect.kitchenCapacity ?? 0;
    summary.waitingGroupLimit += upgrade.effect.waitingGroupLimit ?? 0;
  }

  return summary;
}

export function activeBenefitLabels(ownedUpgradeIds: readonly string[]): string[] {
  const owned = new Set(ownedUpgradeIds);
  return upgrades
    .filter((upgrade) => owned.has(upgrade.id) && upgrade.kind === 'service' && upgrade.benefitLabel)
    .map((upgrade) => `${upgrade.icon} ${upgrade.benefitLabel}`);
}
