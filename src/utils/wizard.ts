import { AuthContext } from '../middleware/auth';

export interface WizardState {
  type: 'task' | 'goal' | 'reward' | 'invite_create' | 'space_switch' | 'reward_set' | 'reward_delete';
  step: number;
  data: Record<string, any>;
}

const wizardStates = new Map<number, WizardState>();

export function getWizardState(userId: bigint): WizardState | undefined {
  return wizardStates.get(Number(userId));
}

export function setWizardState(userId: bigint, state: WizardState | undefined) {
  if (state === undefined) {
    wizardStates.delete(Number(userId));
  } else {
    wizardStates.set(Number(userId), state);
  }
}

export function clearWizardState(userId: bigint) {
  wizardStates.delete(Number(userId));
}