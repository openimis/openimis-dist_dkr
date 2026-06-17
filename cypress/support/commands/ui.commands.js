export function registerUiCommands() {
  Cypress.Commands.add('enterMuiInput', (label, value, inputTag = 'input') => {
    cy.contains('label', label)
      .siblings('.MuiInputBase-root')
      .find(inputTag)
      .first()
      .clear({ force: true })
      .type(value, { force: true });
  });

  Cypress.Commands.add('chooseMuiSelect', (label, value) => {
    cy.contains('label', label)
      .siblings('.MuiInputBase-root')
      .find('[role="button"]')
      .click();

    cy.contains('[role="listbox"] li', value).click({ force: true });
  });

  Cypress.Commands.add('assertMuiInput', (label, value, inputTag = 'input') => {
    const input = cy.contains('label', label)
      .siblings('.MuiInputBase-root')
      .find(inputTag)
      .should('be.visible');
    if (value !== undefined) {
      input.and('have.value', value);
    }
  });

  Cypress.Commands.add('assertMuiInputNotEmpty', (label, inputTag = 'input') => {
    cy.contains('label', label)
      .siblings('.MuiInputBase-root')
      .find(inputTag)
      .should('be.visible')
      .invoke('val')
      .should('not.be.empty');
  });

  Cypress.Commands.add('assertMuiAutoComplete', (label, value) => {
    cy.contains('label', label)
      .siblings('.MuiInputBase-root')
      .find('input')
      .should('be.visible')
      .invoke('val')
      .should('include', value);
  });

  Cypress.Commands.add('assertMuiInputDisabled', (label, value = null, inputTag = 'input') => {
    const input = cy.contains('label', label)
      .siblings('.MuiInputBase-root')
      .find(inputTag);
    input.should('be.disabled');

    if (value) {
      input.should('have.value', value);
    }
  });

  Cypress.Commands.add('assertMuiSelectValue', (label, value) => {
    cy.contains('label', label)
      .siblings('.MuiInputBase-root')
      .contains(value);
  });

  // Drive an openIMIS date-picker field by navigating its calendar popup.
  //
  // Works on both the current CRA build (MUI v3 @material-ui/pickers) and the
  // Vite build (MUI X v7+).  See cypress/docs/mui-date-picker-plan.md for the
  // DOM contract of each version.
  //
  // Accepts ISO (`YYYY-MM-DD`) or DMY (`DD-MM-YYYY`). The final value is
  // always asserted as `DD-MM-YYYY` — openIMIS stores it that way on both.
  //
  // Reason for calendar-navigation instead of typing: `.type()` into the v3
  // field races with the picker's own parser (observed off-by-one-month bugs
  // in payroll specs — `17-05-2026` landed as `17-04-2026`), and the v7
  // sectioned field cannot receive a whole `DD-MM-YYYY` string at once.
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  function parseDate(input) {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(input);
    if (iso) return { year: +iso[1], month: +iso[2] - 1, day: +iso[3] };
    if (dmy) return { year: +dmy[3], month: +dmy[2] - 1, day: +dmy[1] };
    throw new Error(`selectDateFromCalendar: unsupported date "${input}" — use YYYY-MM-DD or DD-MM-YYYY`);
  }

  // v3 MUI @material-ui/pickers keeps the OUTGOING header paragraph in the
  // DOM during its SlideTransition, so reading `.text()` mid-animation yields
  // "May 2026April 2026" — never equal to the target. The fix below computes
  // the month delta up front and, between clicks, waits for the transition
  // to settle (exactly one <p> child) before reading again.
  Cypress.Commands.add('selectDateFromCalendar', (label, dateStr) => {
    const { year, month, day } = parseDate(dateStr);
    const pad = (n) => String(n).padStart(2, '0');
    const expected = `${pad(day)}-${pad(month + 1)}-${year}`;

    cy.contains('label', label).parent().then(($wrap) => {
      const isV7 = $wrap.find('.MuiPickersSectionList-root, button[aria-label="Choose date"]').length > 0;

      const cfg = isV7
        ? {
          // v7 popper — single settled header label, no transition duplication.
          scope: '.MuiPickerPopper-root',
          open: () => cy.wrap($wrap).find('button[aria-label="Choose date"]').click(),
          headerText: '.MuiPickersCalendarHeader-label',
          prev: '.MuiPickersArrowSwitcher-previousIconButton',
          next: '.MuiPickersArrowSwitcher-nextIconButton',
          yearSwitch: '.MuiPickersCalendarHeader-switchViewButton',
          yearSample: '.MuiYearCalendar-root button',
          dayCell: '.MuiDayCalendar-weekContainer .MuiPickersDay-root',
          hiddenDay: '.MuiPickersDay-hiddenDaySpacingFiller, .MuiPickersDay-dayOutsideMonth',
          disabledDay: '.Mui-disabled',
          settleSelector: null,
          ok: null,
        }
        : {
          // v3: scope to the inner Paper rather than `[role="dialog"]` which
          // matches BOTH the outer `.MuiDialog-root` and the inner paper.
          scope: '.MuiPickersModal-dialogRoot',
          open: () => cy.wrap($wrap).find('input').first().click({ force: true }),
          // The header container holds a <p> with the month+year. During the
          // slide animation a second <p> coexists — `:last-child` always
          // points at the newest view.
          headerText: '.MuiPickersCalendarHeader-transitionContainer p:last-child',
          // Scope arrow selectors to the switchHeader so `:nth-of-type` can't
          // drift if other IconButtons appear elsewhere in the paper.
          prev: '.MuiPickersCalendarHeader-switchHeader > button:nth-of-type(1)',
          next: '.MuiPickersCalendarHeader-switchHeader > button:nth-of-type(2)',
          yearSwitch: '.MuiPickersToolbar-toolbar .MuiPickersToolbarButton-toolbarBtn:first-of-type',
          yearSample: '.MuiPickersYear-root',
          dayCell: '.MuiPickersCalendar-week .MuiPickersDay-day',
          hiddenDay: '.MuiPickersDay-hidden',
          disabledDay: '.MuiPickersDay-dayDisabled',
          // Settle = exactly one paragraph in the header container (old exit
          // node has been removed after the slide completes).
          settleSelector: '.MuiPickersCalendarHeader-transitionContainer p',
          ok: 'button',
        };

      const waitForSettle = () => {
        if (cfg.settleSelector) {
          cy.get(`${cfg.scope} ${cfg.settleSelector}`, { timeout: 5000 })
            .should('have.length', 1);
        }
      };

      cfg.open();
      cy.get(`${cfg.scope} ${cfg.headerText}`, { timeout: 10000 }).should('be.visible');
      waitForSettle();

      // Year jump (if needed). v3 preserves the viewed month after a year
      // pick, so the month-stepping loop below still works from the same
      // starting month.
      cy.get(`${cfg.scope} ${cfg.headerText}`).invoke('text').then((txt) => {
        const shownYearStr = txt.trim().split(/\s+/).pop();
        if (+shownYearStr !== year) {
          cy.get(`${cfg.scope} ${cfg.yearSwitch}`).click();
          cy.contains(`${cfg.scope} ${cfg.yearSample}`, new RegExp(`^${year}$`)).click();
          cy.get(`${cfg.scope} ${cfg.headerText}`).should('contain.text', String(year));
          waitForSettle();
        }
      });

      // Compute month delta from the settled header, then click N times
      // waiting for settle between clicks.
      cy.get(`${cfg.scope} ${cfg.headerText}`).invoke('text').then((txt) => {
        const shownMonthName = txt.trim().split(/\s+/)[0];
        const shownMonth = MONTHS.indexOf(shownMonthName);
        if (shownMonth < 0) {
          throw new Error(`selectDateFromCalendar: unrecognized month in header "${txt}"`);
        }
        const delta = month - shownMonth;
        const arrow = delta >= 0 ? cfg.next : cfg.prev;
        const steps = Math.abs(delta);
        for (let i = 0; i < steps; i += 1) {
          cy.get(`${cfg.scope} ${arrow}`).click();
          waitForSettle();
        }
      });

      // Assert we landed on the target month before picking the day.
      cy.get(`${cfg.scope} ${cfg.headerText}`)
        .should('contain.text', `${MONTHS[month]} ${year}`);

      cy.get(`${cfg.scope} ${cfg.dayCell}`)
        .not(cfg.hiddenDay)
        .not(cfg.disabledDay)
        .contains(new RegExp(`^${day}$`))
        .click();

      if (cfg.ok) {
        cy.contains(`${cfg.scope} ${cfg.ok}`, 'OK').click();
      }
      cy.get(cfg.scope, { timeout: 5000 }).should('not.exist');

      cy.contains('label', label).parent().find('input').first()
        .should('have.value', expected);
    });
  });

  // Back-compat alias — the original enterDateInput typed the value and
  // clicked OK, which produced off-by-one-month bugs. Every caller now goes
  // through the calendar-navigation path.
  Cypress.Commands.add('enterDateInput', (label, value) => {
    cy.selectDateFromCalendar(label, value);
  });

  // Open a MUI Select by label and pick the first available option.
  // Useful when the exact option value is dynamic (e.g. Payment Method list
  // returned by the backend).
  Cypress.Commands.add('chooseFirstMuiSelect', (label) => {
    cy.contains('label', label)
      .siblings('.MuiInputBase-root')
      .find('[role="button"]')
      .click();
    cy.get('[role="listbox"] li')
      .should('have.length.at.least', 1)
      .first()
      .click();
  });

  // Check or uncheck a MUI Checkbox identified by its hidden `input[name]`
  // (preferred — most searcher filters use this) or by the text of its label.
  Cypress.Commands.add('toggleMuiCheckbox', (nameOrLabel, checked = true) => {
    cy.get('body').then(($body) => {
      const byName = $body.find(`input[type="checkbox"][name="${nameOrLabel}"]`);
      if (byName.length) {
        if (checked) cy.wrap(byName.first()).check({ force: true });
        else cy.wrap(byName.first()).uncheck({ force: true });
        return;
      }
      const $input = cy.contains('label', nameOrLabel)
        .find('input[type="checkbox"]');
      if (checked) $input.check({ force: true });
      else $input.uncheck({ force: true });
    });
  });

  // Each step re-queries the input — some MUI autocomplete implementations
  // re-render the field as soon as you click/type (e.g. Task Group picker),
  // which detaches prior subjects and causes "subject is no longer attached"
  // errors on chained .clear() / .type() calls.
  Cypress.Commands.add('chooseMuiAutocomplete', (label, value = null) => {
    const inputSelector = () => cy.contains('label', label)
      .siblings('.MuiInputBase-root')
      .find('input');

    inputSelector().click({ force: true });
    if (value) {
      inputSelector().clear({ force: true });
      inputSelector().type(value, { force: true });
    }

    const optionSelector = '[role="menu"] li, [role="presentation"] li, [role="listbox"] li, li[role="option"]';

    if (value) {
      cy.contains(optionSelector, value, { timeout: 15000 }).click({ force: true });
      return;
    }

    cy.get(optionSelector)
      .should('have.length.at.least', 1)
      .first()
      .click({ force: true });
  });
}
