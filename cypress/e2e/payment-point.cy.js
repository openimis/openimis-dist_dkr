import { getTimestamp } from '../support/utils';
import { TIMEOUTS } from '../support/constants';

describe('Payment point workflows', () => {
  const suiteTimestamp = getTimestamp();
  const createdPaymentPoints = new Set();

  // Two locations in different regions drive the filter-exclusion tests.
  const locationA = {
    region: 'Region 1',
    district: 'District 1',
    municipality: 'Achi',
    village: 'Rachla',
  };
  const locationB = {
    region: 'Tahida',
    district: 'Rajo',
    municipality: 'Jaber',
    village: 'Utha',
  };
  const ppmUser = 'Admin';

  // Created in before() and reused across filter tests.
  const filterPointA = {
    name: `PP FilterA ${suiteTimestamp}`.slice(0, 50),
    ...locationA,
    ppm: ppmUser,
  };
  const filterPointB = {
    name: `PP FilterB ${suiteTimestamp}`.slice(0, 50),
    ...locationB,
    ppm: ppmUser,
  };

  const pointData = (label) => ({
    name: `PP ${label} ${suiteTimestamp}`.slice(0, 50),
    ...locationA,
    ppm: ppmUser,
  });

  const trackPoint = (name) => {
    createdPaymentPoints.add(name);
  };

  before(() => {
    cy.login();
    cy.createPaymentPoint(filterPointA);
    trackPoint(filterPointA.name);
    cy.createPaymentPoint(filterPointB);
    trackPoint(filterPointB.name);
    cy.logout();
  });

  after(() => {
    cy.login();
    Array.from(createdPaymentPoints).forEach((name) => {
      cy.deletePaymentPointFromList(name);
    });
    cy.logout();
  });

  beforeEach(() => {
    cy.login();
  });

  it('validates required fields before allowing save', () => {
    cy.openCreatePaymentPoint();
    cy.assertSaveDisabled();
  });

  it('creates a payment point with full location hierarchy', () => {
    const point = pointData('Create');

    cy.createPaymentPoint(point);
    trackPoint(point.name);

    cy.filterPaymentPoints({ name: point.name });
    cy.assertPaymentPointRowVisible({ name: point.name });
  });

  it('verifies detail page fields match after create', () => {
    const point = pointData('Detail');

    cy.createPaymentPoint(point);
    trackPoint(point.name);

    cy.openPaymentPointForViewFromList(point.name);
    cy.assertPaymentPointDetailFields(point);
  });

  it('filters by name toggles visibility', () => {
    cy.filterPaymentPoints({ name: filterPointA.name });
    cy.assertPaymentPointRowVisible({ name: filterPointA.name });
    cy.assertPaymentPointRowNotVisible({ name: filterPointB.name });

    cy.filterPaymentPoints({ name: filterPointB.name });
    cy.assertPaymentPointRowVisible({ name: filterPointB.name });
    cy.assertPaymentPointRowNotVisible({ name: filterPointA.name });
  });

  it('filters by Payment Point Manager', () => {
    cy.filterPaymentPoints({ ppm: ppmUser, name: filterPointA.name });
    cy.assertPaymentPointRowVisible({ name: filterPointA.name });
  });

  it('filters by Region excludes other regions', () => {
    cy.filterPaymentPoints({ region: locationA.region });
    cy.assertPaymentPointRowNotVisible({ name: filterPointB.name });

    cy.filterPaymentPoints({ region: locationB.region });
    cy.assertPaymentPointRowNotVisible({ name: filterPointA.name });
  });

  it('filters by Region and District narrows results', () => {
    cy.filterPaymentPoints({
      region: locationA.region,
      district: locationA.district,
      name: filterPointA.name,
    });
    cy.assertPaymentPointRowVisible({ name: filterPointA.name });
    cy.assertPaymentPointRowNotVisible({ name: filterPointB.name });
  });

  it('filters by Region, District, Municipality narrows results', () => {
    cy.filterPaymentPoints({
      region: locationA.region,
      district: locationA.district,
      municipality: locationA.municipality,
      name: filterPointA.name,
    });
    cy.assertPaymentPointRowVisible({ name: filterPointA.name });
  });

  it('filters by full location hierarchy matches exactly', () => {
    cy.filterPaymentPoints({
      region: locationA.region,
      district: locationA.district,
      municipality: locationA.municipality,
      village: locationA.village,
      name: filterPointA.name,
    });
    cy.assertPaymentPointRowVisible({ name: filterPointA.name });
  });

  it('wrong Region returns no matching test points', () => {
    cy.filterPaymentPoints({
      region: locationB.region,
      name: filterPointA.name,
    });
    cy.assertPaymentPointRowNotVisible({ name: filterPointA.name });
  });

  it('selecting Region populates District options in filter', () => {
    cy.visit('/front/paymentPoints');
    cy.contains('Payment Points Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });
    // Initial fetch briefly re-renders the filter card and detaches subjects.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);

    cy.chooseMuiSelect('Region', 'Region 1');

    cy.contains('label', 'District')
      .siblings('.MuiInputBase-root')
      .find('[role="button"]')
      .click();
    cy.get('[role="listbox"] li', { timeout: TIMEOUTS.BACKEND_VALIDATION })
      .should('have.length.at.least', 1);
    cy.get('body').type('{esc}');
  });

  it('Reset Filters clears all inputs and restores full list', () => {
    cy.visit('/front/paymentPoints');
    cy.contains('Payment Points Found', { timeout: TIMEOUTS.BACKEND_VALIDATION });
    // Initial fetch briefly re-renders the filter card and detaches subjects.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);

    cy.enterMuiInput('Name', 'SomeFilterValue');
    cy.chooseMuiSelect('Region', 'Region 1');

    cy.resetPaymentPointFilters();

    cy.assertMuiInput('Name', '');
  });

  it('views payment point details via eye icon from list', () => {
    cy.openPaymentPointForViewFromList(filterPointA.name);
    cy.assertPaymentPointDetailFields(filterPointA);
  });

  it('edits name and verifies it persists after save', () => {
    const point = pointData('Edit');
    const updatedName = `${point.name} Upd`.slice(0, 50);

    cy.createPaymentPoint(point);
    trackPoint(updatedName);

    cy.openPaymentPointForViewFromList(point.name);
    // The detail fetch overwrites inputs async — assert the loaded value
    // before typing so the edit isn't clobbered.
    cy.assertMuiInput('Name', point.name);
    cy.enterMuiInput('Name', updatedName);
    cy.savePaymentPoint();

    createdPaymentPoints.delete(point.name);

    // Save returns to the list before the update mutation completes; the
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);

    cy.openPaymentPointForViewFromList(updatedName);
    cy.assertPaymentPointDetailFields({ ...point, name: updatedName });
  });

  it('deletes a payment point from the list', () => {
    const point = pointData('Delete');

    cy.createPaymentPoint(point);

    cy.deletePaymentPointFromList(point.name);

    cy.filterPaymentPoints({ name: point.name });
    cy.assertPaymentPointRowNotVisible({ name: point.name });
  });

  it('deletes a payment point from the detail page', () => {
    const point = pointData('DetailDel');

    cy.createPaymentPoint(point);

    cy.openPaymentPointForViewFromList(point.name);

    // Detail-page toolbar exposes the Delete tooltip on the button itself
    // (unlike row actions which have no [title] wrapper).
    cy.get('button.MuiIconButton-root[title*="elete"]', { timeout: 5000 })
      .click({ force: true });

    cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible');
    cy.get('[role="dialog"]').contains('button', /ok|confirm|yes/i).click();

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000);
    cy.filterPaymentPoints({ name: point.name });
    cy.assertPaymentPointRowNotVisible({ name: point.name });
  });
});
