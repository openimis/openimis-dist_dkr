import { registerPaymentPlanCommands } from './payment-plan.commands';
import { registerPaymentCycleCommands } from './payment-cycle.commands';
import { registerPayrollCommands } from './payroll.commands';
import { registerPaymentPointCommands } from './payment-point.commands';

export function registerPaymentCommands() {
  registerPaymentPlanCommands();
  registerPaymentCycleCommands();
  registerPayrollCommands();
  registerPaymentPointCommands();
}
