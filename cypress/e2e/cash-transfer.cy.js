import { getTimestamp } from '../support/utils';

describe('Cash transfer program creation workflows', () => {
  let testProgramNames = [];

  beforeEach(function () {
    cy.login()
  });

  afterEach(() => {
    testProgramNames.forEach(name => {
      cy.deleteProgram(name)
    })
    testProgramNames = []
  })

  it('Creates and deletes an individual program', function () {
    const programCode = 'E2EICP'
    const programName = 'E2E Individual Cash Program'
    const maxBeneficiaries = "100"
    const programType = "INDIVIDUAL"

    cy.createProgram(programCode, programName, maxBeneficiaries, programType)

    // Ensure the created program gets cleaned up later
    testProgramNames.push(programName);

    // Check program field values are persisted
    cy.reload()
    cy.checkProgramFieldValues(programCode, programName, maxBeneficiaries, programType)

    // Check field values displayed in list view
    cy.visit('/front/benefitPlans');
    cy.checkProgramFieldValuesInListView(programCode, programName, maxBeneficiaries, programType)
  })

  it('Creates and deletes an household program', function () {
    const programCode = 'E2EGCP'
    const programName = 'E2E Household Cash Program'
    const maxBeneficiaries = "200"
    const programType = "GROUP"

    cy.createProgram(programCode, programName, maxBeneficiaries, programType)

    // Ensure the created program gets cleaned up later
    testProgramNames.push(programName);

    // Check program field values are persisted
    cy.reload()
    cy.checkProgramFieldValues(programCode, programName, maxBeneficiaries, programType)

    // Check field values displayed in list view
    cy.visit('/front/benefitPlans');
    cy.checkProgramFieldValuesInListView(programCode, programName, maxBeneficiaries, programType)
  })
})

describe('Cash transfer program update workflows', () => {
  const treePlantingActivity = `E2E Tree Planting - ${getTimestamp()}`;
  const riverCleaningActivity = `E2E River Cleaning - ${getTimestamp()}`;
  const activities = [
    treePlantingActivity,
    riverCleaningActivity,
  ];

  before(() => {
    // Disable maker checker
    cy.loginAdminInterface()
    cy.setModuleConfig('social_protection', 'social-protection-config.json')
    cy.setModuleConfig('individual', 'individual-config-minimal.json')
    cy.createActivities(activities)
    cy.logoutAdminInterface()
  })

  describe('Individual program', () => {
    const programCode = 'E2EICPU'
    const programName = 'E2E Individual Cash Program Updated'
    const maxBeneficiaries = "100"
    const programType = "INDIVIDUAL"

    before(() => {
      cy.login()
      cy.createProgram(programCode, programName, maxBeneficiaries, programType)
      cy.logout()
    })

    after(() => {
      cy.deleteProgram(programName)
    })

    beforeEach(function () {
      cy.login()
    })

    it('Updates an individual program', function () {
      const updatedProgramCode = 'E2EICP42'
      const updatedMaxBeneficiaries = "111"
      const updatedInstitution = "Social Protection Agency"
      const updatedDescription = "Foo bar baz"

      cy.visit('/front/benefitPlans');
      cy.openProgramForEditFromList(programName)

      cy.assertMuiInput('Code', programCode)
      cy.enterMuiInput('Code', updatedProgramCode)
      cy.assertMuiInput('Code', updatedProgramCode)

      cy.enterMuiInput('Max Beneficiaries', updatedMaxBeneficiaries)

      cy.enterMuiInput('Institution', updatedInstitution)

      cy.enterMuiInput('Description', updatedDescription, 'textarea')

      cy.get('[title="Save changes"] button').click()

      cy.checkProgramUpdateCompleted()

      // Check program field values are persisted
      cy.reload()
      cy.checkProgramFieldValues(
        updatedProgramCode,
        programName,
        updatedMaxBeneficiaries,
        programType,
        updatedInstitution,
        updatedDescription,
      )
    })

    it('configures default enrollment criteria for an individual program and enrolls individuals', function () {
      const criterionField = 'Educated level'
      const criterionFilter = 'Contains'
      const criterionValue = 'prim'

      cy.configureDefaultEnrollmentCriteria(
        programName,
        'Potential',
        criterionField,
        criterionFilter,
        criterionValue,
      )

      cy.enrollIndividualBeneficiariesIntoProgram(
        programName,
        programCode,
        'Potential',
        criterionField,
        criterionFilter,
        criterionValue,
      )
    })

    it('Creates a project under an individual program', function () {
      const projectName = `E2E Individual Training Project - ${getTimestamp()}`
      const regionName = 'R1 Region 1'
      const targetBeneficiaries = "100"
      const workingDays = "60"

      cy.createProject(
        programName, projectName, treePlantingActivity,
        regionName, null, targetBeneficiaries, workingDays,
      )

      cy.reload()

      cy.assertMuiInput('Name', projectName)
      cy.assertMuiInput('Activity', treePlantingActivity)
      cy.assertMuiInput('Location', regionName)
      cy.assertMuiInput('Target Beneficiaries', targetBeneficiaries)
      cy.assertMuiInput('Working Days', workingDays)
    })

    describe('Given a project and an individual program', function () {
      const projectName = `E2E Existing Individual Project - ${getTimestamp()}`
      const regionName = 'R1 Region 1'
      const districtName = 'R1D2 Jambero'
      const targetBeneficiaries = "20"
      const workingDays = "10"
      let projectPath = null

      before(() => {
        cy.login()
        cy.createProject(
          programName, projectName, treePlantingActivity,
          regionName, districtName, targetBeneficiaries, workingDays,
        )
        cy.url().then((currentUrl) => {
          projectPath = new URL(currentUrl).pathname;
        });
        cy.logout()
      })

      it('Enrolls active individuals into a project', function () {
        const criterionField = 'Able bodied'
        const criterionFilter = 'Exact'
        const criterionValue = 'False'

        cy.configureDefaultEnrollmentCriteria(
          programName,
          'Active',
          criterionField,
          criterionFilter,
          criterionValue,
        )

        cy.enrollIndividualBeneficiariesIntoProgram(
          programName,
          programCode,
          'Active',
          criterionField,
          criterionFilter,
          criterionValue,
        )

        cy.visit(projectPath)
        cy.contains('h6', '0 Beneficiaries Assigned')
        cy.contains('button', 'Assign Beneficiaries').click()
        cy.get('[role="progressbar"]').should('exist')
        cy.get('[role="progressbar"]').should('not.exist')

        cy.contains('h2', 'Assign Active Beneficiaries')
        cy.contains('h6', '0 active beneficiaries selected')
        cy.get('[role="dialog"] [title="Previous Page"]')
          .next('span')
          .invoke('text')
          .then((text) => {
            // extract 304 from text e.g. 1-10 of 304
            const match = text.match(/of\s+(\d+)/);
            cy.wrap(Number(match[1])).as('numCandidates');
          });

        // filter beneficiaries by number of children
        cy.contains('[role="dialog"] button', '=').trigger('mouseover');
        cy.contains('li', '<').click();
        cy.get('[role="dialog"] input[type="number"]').clear().type('5');

        cy.get('[role="progressbar"]').should('exist')
        cy.get('[role="progressbar"]').should('not.exist')

        cy.get('@numCandidates').then((prevTotal) => {
          cy.get('[role="dialog"] [title="Previous Page"]')
            .next('span')
            .invoke('text')
            .then((text) => {
              const match = text.match(/of\s+(\d+)/);
              const total = Number(match[1]);
              expect(prevTotal - total).to.gt(0);
            });
        });

        // assign all matching beneficiaries from the first page
        cy.get('th input[type="checkbox"]').check()
        cy.contains('h6', '0 active beneficiaries selected').should('not.exist')
        cy.get('[role="dialog"] h6')
          .invoke('text')
          .then((text) => {
            // 1 active beneficiaries selected
            const match = text.match(/(\d+) active beneficiaries selected/);
            cy.wrap(match[1]).as('assignedProjectBeneficiaries');
          });

        cy.contains('button', 'Save').click()
        cy.get('[role="progressbar"]').should('exist')
        cy.get('[role="progressbar"]').should('not.exist')

        cy.get('@assignedProjectBeneficiaries').then((expectedNumAssigned) => {
          cy.contains('h6', `${expectedNumAssigned} Beneficiaries Assigned`)
        })

        // Check that all assigned beneficiaries share the project's district
        cy.get('table').first().within(() => {
          cy.get('th').then(($ths) => {
            const districtIndex = [...$ths].findIndex(
              (th) => th.innerText.trim().includes('District')
            );
            cy.get(`tbody tr td:nth-child(${districtIndex + 1})`)
              .each(($td, i) => {
                // skip the filter row
                if (i>0) expect($td.text().trim()).to.eq('Jambero');
              });
          });
        });

        // Assigned beneficiaries can be filtered
        cy.get('td input[aria-label="filter data by Educated Level"]')
          .clear()
          .type('Ter')
        cy.wait(500) // give the filter results to settle down
        cy.get('@assignedProjectBeneficiaries').then((assignedProjectBeneficiaries) => {
          cy.get('[title="Previous Page"]')
            .next('span')
            .invoke('text')
            .then((text) => {
              const match = text.match(/of\s+(\d+)/);
              const filteredTotal = Number(match[1]);
              expect(assignedProjectBeneficiaries - filteredTotal).to.gt(0);
            });
        });
      })

      it('Updates a project', function () {
        cy.visit(projectPath)
        cy.assertMuiInput('Name', projectName)

        const projectNameUpdated = `${projectName} Updated`
        cy.enterMuiInput('Name', projectNameUpdated)

        cy.chooseMuiAutocomplete('Activity', riverCleaningActivity)

        const regionNameUpdated = 'R1 Region 1'
        const districtNameUpdated = 'R1D1 District 1'
        const municipalityName = 'R1D1M2 Jamu'
        cy.chooseMuiAutocomplete('Location', regionNameUpdated)
        cy.contains('li', districtNameUpdated).click()
        cy.contains('li', municipalityName).click()

        const targetBeneficiariesUpdated = "20"
        cy.enterMuiInput('Target Beneficiaries', targetBeneficiariesUpdated)

        const workingDaysUpdated = "10"
        cy.enterMuiInput('Working Days', workingDaysUpdated)

        cy.get('[title="Save"] button').click()

        // Wait for update to complete
        cy.get('ul.MuiList-root li div[role="progressbar"]').should('exist')
        cy.get('ul.MuiList-root li div[role="progressbar"]').should('not.exist')

        // Check last journal message
        cy.get('ul.MuiList-root li').first().click()
        cy.contains(`Update project ${projectName}`).should('exist')
        cy.contains('Failed to update').should('not.exist')

        cy.visit(projectPath)

        cy.assertMuiInput('Name', projectNameUpdated)
        cy.assertMuiInput('Activity', riverCleaningActivity)
        cy.assertMuiInput('Location', municipalityName)
        cy.assertMuiInput('Target Beneficiaries', targetBeneficiariesUpdated)
        cy.assertMuiInput('Working Days', workingDaysUpdated)
      })

      it('Deletes and restores a project', function () {
        cy.visit(projectPath)
        cy.contains('Beneficiaries Assigned')
        cy.contains('label', 'Name')
          .siblings('.MuiInputBase-root')
          .find('input')
          .invoke('val')
          .then((name) => {
            cy.deleteProject(projectPath);

            cy.contains('button', 'Projects').click()
            cy.contains('label', 'Show Deleted').click()
            cy.contains('button', 'Search').click()

            cy.contains('td', name)
              .parent('tr').within(() => {
                cy.get('button[title="Edit"]').click({force: true});
              })

            cy.assertMuiInputDisabled('Name', name)
            cy.assertMuiInputDisabled('Activity')
            cy.assertMuiInputDisabled('Location')
            cy.assertMuiInputDisabled('Target Beneficiaries')
            cy.assertMuiInputDisabled('Working Days')
            cy.assertMuiInputDisabled('Status')
            cy.assertMuiInputDisabled('Program')

            cy.get('button[title="Undo Delete"]').click()
            cy.contains('button', 'Ok').click();

            // Wait for undo to complete
            cy.get('ul.MuiList-root li div[role="progressbar"]').should('exist')
            cy.get('ul.MuiList-root li div[role="progressbar"]').should('not.exist')

            // Check last journal message
            cy.get('ul.MuiList-root li').first().click()
            cy.contains(`Restore project`).should('exist')
            cy.contains('Failed to restore').should('not.exist')

            cy.reload()

            cy.contains('button', 'Projects').click()
            cy.contains(name).should('exist');
          });
      })
    })
  })

  describe('Household program', () => {
    let programCode = 'E2EGCPU'
    const programName = 'E2E Household Cash Program Updated'
    const maxBeneficiaries = "200"
    const programType = "GROUP"

    before(() => {
      cy.login()
      cy.createProgram(programCode, programName, maxBeneficiaries, programType)
      cy.logout()
    })

    after(() => {
      cy.deleteProgram(programName)
    })

    beforeEach(() => {
      cy.login()
    })

    it('Updates a household program', function () {
      const updatedProgramCode = 'E2EGCP42'
      const updatedMaxBeneficiaries = "222"
      const updatedInstitution = "Family Support Services"
      const updatedDescription = "A functional program"

      cy.visit('/front/benefitPlans');
      cy.openProgramForEditFromList(programName)

      cy.assertMuiInput('Code', programCode)
      cy.enterMuiInput('Code', updatedProgramCode)
      cy.assertMuiInput('Code', updatedProgramCode)

      cy.enterMuiInput('Max Beneficiaries', updatedMaxBeneficiaries)

      cy.enterMuiInput('Institution', updatedInstitution)

      cy.enterMuiInput('Description', updatedDescription, 'textarea')

      cy.get('[title="Save changes"] button').click()

      cy.checkProgramUpdateCompleted()

      // Check program field values are persisted
      cy.reload()
      cy.checkProgramFieldValues(
        updatedProgramCode,
        programName,
        updatedMaxBeneficiaries,
        programType,
        updatedInstitution,
        updatedDescription,
      )

      // Update in case other test needs the programCode
      programCode = updatedProgramCode
    })

    it('configures default enrollment criteria for a household program and enrolls households', function () {
      const criterionField = 'Number of children'
      const criterionFilter = 'Greater than or equal to'
      const criterionValue = '2'

      cy.configureDefaultEnrollmentCriteria(
        programName,
        'Active',
        criterionField,
        criterionFilter,
        criterionValue,
      )

      cy.enrollGroupBeneficiariesIntoProgram(
        programName,
        programCode,
        'Active',
        criterionField,
        criterionFilter,
        criterionValue,
      )
    })

    it('Creates a project under a household program', function () {
      const projectName = `E2E Public Works Project - ${getTimestamp()}`
      const regionName = 'R2 Tahida'
      const districtName = 'R2D2 Vida'
      const targetBeneficiaries = "50"
      const workingDays = "20"

      cy.createProject(
        programName, projectName, treePlantingActivity,
        regionName, districtName, targetBeneficiaries, workingDays,
      )

      cy.reload()

      cy.assertMuiInput('Name', projectName)
      cy.assertMuiInput('Activity', treePlantingActivity)
      cy.assertMuiInput('Location', districtName)
      cy.assertMuiInput('Target Beneficiaries', targetBeneficiaries)
      cy.assertMuiInput('Working Days', workingDays)
    })

    describe('Given a project and a household program', function () {
      const projectName = `E2E Existing Group Project - ${getTimestamp()}`
      const regionName = 'R1 Region 1'
      const targetBeneficiaries = "20"
      const workingDays = "10"
      let projectPath = null

      before(() => {
        cy.login()
        cy.createProject(
          programName, projectName, treePlantingActivity,
          regionName, null, targetBeneficiaries, workingDays,
        )
        cy.url().then((currentUrl) => {
          projectPath = new URL(currentUrl).pathname;
        });
        cy.logout()
      })

      it('Enrolls active households into a project', function () {
        const criterionField = 'Number of children'
        const criterionFilter = 'Less than'
        const criterionValue = '6'

        cy.configureDefaultEnrollmentCriteria(
          programName,
          'Active',
          criterionField,
          criterionFilter,
          criterionValue,
        )

        cy.enrollGroupBeneficiariesIntoProgram(
          programName,
          programCode,
          'Active',
          criterionField,
          criterionFilter,
          criterionValue,
        )

        cy.contains('tfoot', 'Rows Per Page').should('be.visible')
        cy.chooseMuiSelect('Region', regionName)
        cy.contains('button', 'Search').click()
        cy.contains('Loading...')
        cy.contains('tfoot', 'Rows Per Page').should('be.visible')
        cy.get('table').within(() => {
          cy.get('th').then(($ths) => {
            const districtIndex = [...$ths].findIndex(
              (th) => th.innerText.trim() === 'District'
            );
            cy.get(`tbody tr:first td:nth-child(${districtIndex + 1})`)
              .invoke('text')
              .then((districtValue) => {
                cy.wrap(districtValue.trim()).as('activeDistrict');
              });
          });
        });

        cy.visit(projectPath)
        cy.contains('h6', '0 Beneficiaries Assigned')
        cy.contains('button', 'Assign Beneficiaries').click()
        cy.get('[role="progressbar"]').should('exist')
        cy.get('[role="progressbar"]').should('not.exist')

        cy.contains('h2', 'Assign Active Beneficiaries')
        cy.contains('h6', '0 active beneficiaries selected')
        cy.get('[role="dialog"] [title="Previous Page"]')
          .next('span')
          .invoke('text')
          .then((text) => {
            // extract 304 from text e.g. 1-10 of 304
            const match = text.match(/of\s+(\d+)/);
            cy.wrap(Number(match[1])).as('numCandidates');
          });

        // filter beneficiaries by district
        cy.get('@activeDistrict').then((district) => {
          cy.get('[role="dialog"] input[aria-label="filter data by District"]')
            .clear()
            .type(district)
          cy.get('[role="progressbar"]').should('exist')
          cy.get('[role="progressbar"]').should('not.exist')
        });

        cy.get('@numCandidates').then((prevTotal) => {
          cy.get('[role="dialog"] [title="Previous Page"]')
            .next('span')
            .invoke('text')
            .then((text) => {
              const match = text.match(/of\s+(\d+)/);
              const total = Number(match[1]);
              expect(prevTotal - total).to.gt(0);
            });
        });

        // assign all matching beneficiaries from the first page
        cy.get('th input[type="checkbox"]').check()
        cy.contains('h6', '0 active beneficiaries selected').should('not.exist')
        cy.get('[role="dialog"] h6')
          .invoke('text')
          .then((text) => {
            // 1 active beneficiaries selected
            const match = text.match(/(\d+) active beneficiaries selected/);
            cy.wrap(match[1]).as('assignedProjectBeneficiaries');
          });

        cy.contains('button', 'Save').click()
        cy.get('[role="progressbar"]').should('exist')
        cy.get('[role="progressbar"]').should('not.exist')

        cy.get('@assignedProjectBeneficiaries').then((expectedNumAssigned) => {
          cy.contains('h6', `${expectedNumAssigned} Beneficiaries Assigned`)
        })

        // Check that all assigned beneficiaries share the same district
        cy.get('table').first().within(() => {
          cy.get('th').then(($ths) => {
            const districtIndex = [...$ths].findIndex(
              (th) => th.innerText.trim().includes('District')
            );
            cy.get('@activeDistrict').then((activeDistrict) => {
              cy.get(`tbody tr td:nth-child(${districtIndex + 1})`)
                .each(($td, i) => {
                  // skip the filter row
                  if (i>0) expect($td.text().trim()).to.eq(activeDistrict);
                });
            });
          });
        });
      })

      it('Updates a project', function () {
        cy.visit(projectPath)
        cy.assertMuiInput('Name', projectName)

        const projectNameUpdated = `${projectName} Updated`
        cy.enterMuiInput('Name', projectNameUpdated)

        cy.chooseMuiAutocomplete('Activity', riverCleaningActivity)

        const regionNameUpdated = 'R1 Region 1'
        const districtNameUpdated = 'R1D1 District 1'
        const municipalityName = 'R1D1M2 Jamu'
        cy.chooseMuiAutocomplete('Location', regionNameUpdated)
        cy.contains('li', districtNameUpdated).click()
        cy.contains('li', municipalityName).click()

        const targetBeneficiariesUpdated = "20"
        cy.enterMuiInput('Target Beneficiaries', targetBeneficiariesUpdated)

        const workingDaysUpdated = "10"
        cy.enterMuiInput('Working Days', workingDaysUpdated)

        cy.get('[title="Save"] button').click()

        // Wait for update to complete
        cy.get('ul.MuiList-root li div[role="progressbar"]').should('exist')
        cy.get('ul.MuiList-root li div[role="progressbar"]').should('not.exist')

        // Check last journal message
        cy.get('ul.MuiList-root li').first().click()
        cy.contains(`Update project ${projectName}`).should('exist')
        cy.contains('Failed to update').should('not.exist')

        cy.visit(projectPath)

        cy.assertMuiInput('Name', projectNameUpdated)
        cy.assertMuiInput('Activity', riverCleaningActivity)
        cy.assertMuiInput('Location', municipalityName)
        cy.assertMuiInput('Target Beneficiaries', targetBeneficiariesUpdated)
        cy.assertMuiInput('Working Days', workingDaysUpdated)
      })

      it('Deletes and restores a project', function () {
        cy.visit(projectPath)
        cy.contains('Beneficiaries Assigned')
        cy.contains('label', 'Name')
          .siblings('.MuiInputBase-root')
          .find('input')
          .invoke('val')
          .then((name) => {
            cy.deleteProject(projectPath);

            cy.contains('button', 'Projects').click()
            cy.contains('label', 'Show Deleted').click()
            cy.contains('button', 'Search').click()

            cy.contains('td', name)
              .parent('tr').within(() => {
                cy.get('button[title="Edit"]').click({force: true});
              })

            cy.assertMuiInputDisabled('Name', name)
            cy.assertMuiInputDisabled('Activity')
            cy.assertMuiInputDisabled('Location')
            cy.assertMuiInputDisabled('Target Beneficiaries')
            cy.assertMuiInputDisabled('Working Days')
            cy.assertMuiInputDisabled('Status')
            cy.assertMuiInputDisabled('Program')

            cy.get('button[title="Undo Delete"]').click()
            cy.contains('button', 'Ok').click();

            // Wait for undo to complete
            cy.get('ul.MuiList-root li div[role="progressbar"]').should('exist')
            cy.get('ul.MuiList-root li div[role="progressbar"]').should('not.exist')

            // Check last journal message
            cy.get('ul.MuiList-root li').first().click()
            cy.contains(`Restore project`).should('exist')
            cy.contains('Failed to restore').should('not.exist')

            cy.reload()

            cy.contains('button', 'Projects').click()
            cy.contains(name).should('exist');
          });
      })
    })
  })
})

describe('Individuals and groups/households', () => {
  before(() => {
    // Disable maker checker
    cy.loginAdminInterface()
    cy.setModuleConfig('individual', 'individual-config-minimal.json')
    cy.logoutAdminInterface()
  })

  it('Imports individuals and groups', function () {
    cy.login()
    cy.visit('/front/groups')
    cy.getItemCount('Group').as('initialGroupCount');

    cy.visit('/front/individuals')
    cy.getItemCount('Individual').as('initialIndividualCount');

    cy.uploadIndividualsCSV()

    cy.visit('/front/individuals')
    cy.getItemCount("Individual").then(newCount => {
      cy.get('@initialIndividualCount').then(initial => {
        expect(newCount - initial).to.eq(100);
      });
    });

    cy.wait(10000) // group creation takes time

    cy.visit('/front/groups')
    cy.getItemCount("Group").then(newCount => {
      cy.get('@initialGroupCount').then(initial => {
        expect(newCount - initial).to.eq(20);
      });
    });
  })
})
