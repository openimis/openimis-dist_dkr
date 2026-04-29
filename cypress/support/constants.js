// Shared constants used across the payment E2E suite.
//
// Keep this file small and focused on values that are referenced from more
// than one spec/command file.  Single-use values belong next to their caller.

export const CALC_RULES = {
  SOCIAL_PROTECTION: 'Calculation rule: social protection',
  TIMESHEET: 'Calculation rule: timesheet',
};

export const PAYROLL_STATUS = {
  PENDING_APPROVAL: 'PENDING APPROVAL',
  APPROVE_FOR_PAYMENT: 'APPROVE FOR PAYMENT',
  RECONCILED: 'RECONCILED',
  REJECTED: 'REJECTED',
};

export const PAYMENT_CYCLE_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
};

export const TIMEOUTS = {
  // Async backend validation (e.g. code-uniqueness, custom filter resolution).
  // Set to 45s — successful paths return immediately; the headroom is for
  // CI runs where backend round-trips are slower than a developer machine.
  BACKEND_VALIDATION: 45000,
  // Default Cypress defaultCommandTimeout override for flaky UI probes.
  SHORT_PROBE: 3000,
};
