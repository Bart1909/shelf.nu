import { faker } from "@faker-js/faker";
import { test, expect } from "../fixtures/account";

/** To use console log while testing you need to use the following snippet:
 * ```
 *  await page.evaluate((confirmUrl) => {
      console.log(confirmUrl);
    }, confirmUrl);
    ```
 */

// Annotate entire file as serial.
test.describe.configure({ mode: "serial" });

const testAsset = {
  title: faker.lorem.words(2),
  description: faker.lorem.sentences(1),
};

test("should allow you to make a asset", async ({ page, account }) => {
  page.on("console", (message) => {
    console.log(`[Page Console] ${message.text()}`);
  });

  await page.click('[data-test-id="createNewAsset"]');
  await expect(page).toHaveURL(/.*assets\/new/);
  const focusedElement = await page.$(":focus");
  expect(await focusedElement?.getAttribute("name")).toBe("title");
  await page.getByLabel("Name").fill(testAsset.title);
  await page.getByLabel("Description").fill(testAsset.description);
  await page.click(`[data-test-id="save-asset"]`);

  await page.click('[data-test-id="closeToast"]');

  /**Make sure the asset you just created is showing in the list */
  await expect(
    page.locator(
      'span.word-break.mb-1.block.font-medium:has-text("' +
        testAsset.title +
        '")'
    )
  ).toBeVisible({ timeout: 30000 });

  await page.click('[data-test-id="user-actions-dropdown"]');
  await page.click('[data-test-id="logout"]');
  await expect(page).toHaveURL(/.*login/);
});

test("should allow you to make a category", async ({ page, account }) => {
  const testCategory = {
    title: faker.lorem.words(2),
    description: faker.lorem.sentences(1),
  };

  /** create category */
  await page.click('[data-test-id="categoriesSidebarMenuItem"]');
  await page.click('[data-test-id="createNewCategory"]');
  await expect(page).toHaveURL(/.*categories\/new/);

  await page
    .getByPlaceholder("Category name", { exact: true })
    .fill(testCategory.title);
  await page.getByLabel("Description").fill(testCategory.description);
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText(testCategory.title)).toBeVisible({
    timeout: 20000,
  });

  await page.click('[data-test-id="user-actions-dropdown"]');
  await page.click('[data-test-id="logout"]');
  await expect(page).toHaveURL(/.*login/);
});

const teamMemberName = faker.person.firstName();
test("should allow you to add team member", async ({ page, account }) => {
  await page.click('[data-test-id="settingsSidebarMenuItem"]');
  await expect(page).toHaveURL(/.*settings\/account/);

  await page.click('[data-test-id="teamTab"]');
  await expect(page).toHaveURL(/.*settings\/team/);

  await page.getByLabel("new team member").click();
  await expect(page).toHaveURL(/.*settings\/team\/add-member/);

  await page.getByPlaceholder("Enter team member’s name").fill(teamMemberName);
  await page.getByRole("button", { name: "Add team member" }).click();

  await expect(page.getByText(teamMemberName)).toBeVisible();
  await page.click('[data-test-id="user-actions-dropdown"]');
  await page.click('[data-test-id="logout"]');
  await expect(page).toHaveURL(/.*login/);
});

test("should allow you to check out an asset", async ({ page, account }) => {
  const asset = page.getByText(testAsset.title);
  await expect(asset).toBeVisible();
  await asset.click();

  await expect(
    page.getByRole("heading", { name: testAsset.title })
  ).toBeVisible();

  await page.click('[data-test-id="assetActionsButton"]');

  await page.locator('[data-test-id="check-out-asset-button"]').click();

  await expect(page).toHaveURL(/.*assets\/[^]*\/check-out/);

  await page.getByText("Select a team member").click();

  await page.click(`[data-test-id="dynamic-select-item-${teamMemberName}"]`);

  await page.getByRole("button", { name: "Confirm" }).click();

  /** Make sure the status of the asset is changed */
  await expect(
    page.locator("span").filter({ hasText: "In custody" }).first()
  ).toBeVisible();

  /** Make sure note is created */
  await expect(
    page.getByText(
      `${account.firstName} ${account.lastName} has given ${teamMemberName} custody over ${testAsset.title}`
    )
  ).toBeVisible();

  /** Make sure toast is showing with the correct message */
  await expect(
    page.getByText(
      `‘${testAsset.title}’ is now in custody of ${teamMemberName}`,
      { exact: true }
    )
  ).toBeVisible();
  await page.click('[data-test-id="closeToast"]');
});

test("should allow you to check in an asset", async ({ page, account }) => {
  const asset = page.getByText(testAsset.title);
  await expect(asset).toBeVisible();
  await asset.click();

  await expect(
    page.getByRole("heading", { name: testAsset.title })
  ).toBeVisible();

  await page.click('[data-test-id="assetActionsButton"]');

  await page.locator('[data-test-id="check-in-asset-button"]').click();

  await expect(page).toHaveURL(/.*assets\/[^]*\/check-in/);
  await page.getByRole("button", { name: "Confirm" }).click();

  /** Make sure the status of the asset is changed */
  await expect(
    page.locator("span").filter({ hasText: "Available" }).first()
  ).toBeVisible();

  /** Make sure note is created */
  await expect(
    page.getByText(
      `${account.firstName} ${account.lastName} has released ${teamMemberName}'s custody over ${testAsset.title}`
    )
  ).toBeVisible();

  /** Make sure toast is showing with the correct message */
  await expect(
    page.getByText(
      `‘${testAsset.title}’ is no longer in custody of ‘${teamMemberName}’`,
      { exact: true }
    )
  ).toBeVisible();

  await page.click('[data-test-id="closeToast"]');
});
