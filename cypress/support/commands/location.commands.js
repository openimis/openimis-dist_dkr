// Generic location-picker helpers.
//
// In the openIMIS UI, Region and District pickers are rendered as
// AutoSuggestion/MUI Select, while Municipality and Village are
// LocationPicker/MUI Autocomplete.  This module hides that asymmetry behind
// a single `chooseLocation` command.

const LOCATION_SELECT_LABELS = ['Region', 'District'];

function chooseLocationLevel(label, value) {
  if (LOCATION_SELECT_LABELS.includes(label)) {
    cy.chooseMuiSelect(label, value);
  } else {
    cy.chooseMuiAutocomplete(label, value);
  }
}

export function registerLocationCommands() {
  // Pick values top-down across the location hierarchy.  Each level is
  // optional; the user passes only the levels they want to set.
  Cypress.Commands.add('chooseLocation', ({
    region, district, municipality, village,
  } = {}) => {
    if (region) chooseLocationLevel('Region', region);
    if (district) chooseLocationLevel('District', district);
    if (municipality) chooseLocationLevel('Municipality', municipality);
    if (village) chooseLocationLevel('Village', village);
  });

  // Exposed for callers that only need to pick a single level (e.g. filter panes).
  Cypress.Commands.add('chooseLocationLevel', chooseLocationLevel);
}
