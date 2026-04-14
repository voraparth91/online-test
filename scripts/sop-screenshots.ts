import { chromium } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "docs/sop/screenshots";

const ADMIN_USERNAME = "tirtha";
const ADMIN_PASSWORD = "tirtha@4009";

// We'll create a test candidate through the admin flow
const TEST_CANDIDATE_NAME = "SOP Test User";
const TEST_CANDIDATE_USERNAME = "sop.testuser";
const TEST_CANDIDATE_PASSWORD = "test123456";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  // Use separate contexts so admin logout doesn't affect candidate session
  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const candidateContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const context = adminContext; // for backwards compat in admin section

  // ============================================================
  // PART 1: ADMIN FLOW
  // ============================================================
  console.log("=== ADMIN FLOW ===");

  const adminPage = await context.newPage();

  // 1. Login Page
  console.log("1. Login page...");
  await adminPage.goto(`${BASE_URL}/login`);
  await adminPage.waitForSelector('input[name="username"]');
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/01-login-page.png`, fullPage: true });

  // 2. Admin Login
  console.log("2. Admin login...");
  await adminPage.fill('input[name="username"]', ADMIN_USERNAME);
  await adminPage.fill('input[name="password"]', ADMIN_PASSWORD);
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/02-admin-login-filled.png`, fullPage: true });
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL("**/admin/dashboard", { timeout: 10000 });
  await sleep(1000);

  // 3. Admin Dashboard
  console.log("3. Admin dashboard...");
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/03-admin-dashboard.png`, fullPage: true });

  // 4. Candidates Page
  console.log("4. Candidates page...");
  await adminPage.click('a[href="/admin/candidates"]');
  await adminPage.waitForURL("**/admin/candidates");
  await sleep(1000);
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/04-admin-candidates-list.png`, fullPage: true });

  // 5. Create Candidate Dialog
  console.log("5. Create candidate...");
  await adminPage.click("text=Add Candidate");
  await sleep(500);
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/05-admin-create-candidate-dialog.png`, fullPage: true });

  // 6. Fill and create candidate
  console.log("6. Fill candidate form...");
  await adminPage.fill('input[name="full_name"]', TEST_CANDIDATE_NAME);
  await adminPage.fill('input[name="username"]', TEST_CANDIDATE_USERNAME);
  await adminPage.fill('input[name="password"]', TEST_CANDIDATE_PASSWORD);
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/06-admin-create-candidate-filled.png`, fullPage: true });
  await adminPage.click("text=Create Candidate");
  await sleep(2000);
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/07-admin-candidate-created.png`, fullPage: true });
  // Close dialog if still open (e.g., if username already taken)
  await adminPage.keyboard.press("Escape");
  await sleep(500);

  // 7. Edit Candidate
  console.log("7. Edit candidate...");
  const editButtons = adminPage.locator('button:has(svg.lucide-pencil)');
  if ((await editButtons.count()) > 0) {
    await editButtons.first().click();
    await sleep(500);
    await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/08-admin-edit-candidate-dialog.png`, fullPage: true });
    await adminPage.keyboard.press("Escape");
    await sleep(500);
  }

  // 8. Exams Page
  console.log("8. Exams page...");
  await adminPage.click('a[href="/admin/exams"]');
  await adminPage.waitForURL("**/admin/exams");
  await sleep(1000);
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/09-admin-exams-list.png`, fullPage: true });

  // 9. Create Exam Dialog
  console.log("9. Create exam dialog...");
  await adminPage.click("text=Create Exam");
  await sleep(500);
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/10-admin-create-exam-dialog.png`, fullPage: true });
  await adminPage.keyboard.press("Escape");
  await sleep(300);

  // 10. Exam Detail Page (click first exam)
  console.log("10. Exam detail...");
  const examLinks = adminPage.locator('a[href^="/admin/exams/"] button:has(svg.lucide-external-link)');
  if ((await examLinks.count()) > 0) {
    await examLinks.first().click();
    await sleep(1500);
    await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/11-admin-exam-detail.png`, fullPage: true });

    // 11. Scroll to see questions
    console.log("11. Exam questions...");
    await adminPage.evaluate(() => window.scrollTo(0, 600));
    await sleep(500);
    await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/12-admin-exam-questions.png`, fullPage: true });

    // 12. Add Question Dialog
    console.log("12. Add question dialog...");
    await adminPage.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
    const addQBtn = adminPage.locator("text=Add Question");
    if ((await addQBtn.count()) > 0) {
      await addQBtn.first().click();
      await sleep(500);
      await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/13-admin-add-question-dialog.png`, fullPage: true });
      await adminPage.keyboard.press("Escape");
      await sleep(300);
    }

    // 13. Edit Question Dialog
    console.log("13. Edit question dialog...");
    const editQButtons = adminPage.locator('button:has(svg.lucide-pencil)');
    if ((await editQButtons.count()) > 0) {
      await editQButtons.first().click();
      await sleep(500);
      await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/14-admin-edit-question-dialog.png`, fullPage: true });
      await adminPage.keyboard.press("Escape");
      await sleep(300);
    }

    // 14. Exam Results Page
    console.log("14. Exam results...");
    await adminPage.goBack();
    await sleep(1000);
    const resultsLinks = adminPage.locator("text=Results").first();
    if ((await resultsLinks.count()) > 0) {
      await resultsLinks.click();
      await sleep(1500);
      await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/15-admin-exam-results.png`, fullPage: true });

      // 15. Attempt Detail
      console.log("15. Attempt detail...");
      const detailBtn = adminPage.locator("text=Detail").first();
      if ((await detailBtn.count()) > 0) {
        await detailBtn.click();
        await sleep(1500);
        await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/16-admin-attempt-detail.png`, fullPage: true });
        await adminPage.evaluate(() => window.scrollTo(0, 400));
        await sleep(300);
        await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/17-admin-attempt-detail-questions.png`, fullPage: true });
      }
    }
  }

  // 16. Make exam live (go to exam detail, toggle)
  console.log("16. Toggle exam live...");
  await adminPage.goto(`${BASE_URL}/admin/exams`);
  await sleep(1000);
  const examLink2 = adminPage.locator('a[href^="/admin/exams/"] button:has(svg.lucide-external-link)');
  if ((await examLink2.count()) > 0) {
    await examLink2.first().click();
    await sleep(1500);
    await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/18-admin-exam-live-toggle.png`, fullPage: true });
  }

  // Admin logout
  console.log("17. Admin logout...");
  await adminPage.click("text=Sign Out");
  await sleep(1500);

  // ============================================================
  // PART 2: CANDIDATE FLOW
  // ============================================================
  console.log("\n=== CANDIDATE FLOW ===");

  const candidatePage = await candidateContext.newPage();

  // 1. Candidate Login
  console.log("1. Candidate login...");
  await candidatePage.goto(`${BASE_URL}/login`);
  await candidatePage.waitForSelector('input[name="username"]');
  await candidatePage.fill('input[name="username"]', TEST_CANDIDATE_USERNAME);
  await candidatePage.fill('input[name="password"]', TEST_CANDIDATE_PASSWORD);
  await candidatePage.screenshot({ path: `${SCREENSHOT_DIR}/19-candidate-login.png`, fullPage: true });
  await candidatePage.click('button[type="submit"]');
  await candidatePage.waitForURL("**/candidate/dashboard", { timeout: 10000 });
  await sleep(1500);

  // 2. Candidate Dashboard
  console.log("2. Candidate dashboard...");
  await candidatePage.screenshot({ path: `${SCREENSHOT_DIR}/20-candidate-dashboard.png`, fullPage: true });

  // 3. Start Exam
  console.log("3. Start exam...");
  const startBtn = candidatePage.locator("text=Start Exam").first();
  if ((await startBtn.count()) > 0) {
    await startBtn.click();
    // Wait for exam page to load — either questions appear or an error/message
    await sleep(5000);

    // 4. Exam Page - Header with timer
    console.log("4. Exam page...");
    await candidatePage.screenshot({ path: `${SCREENSHOT_DIR}/21-candidate-exam-top.png` });

    // Check if questions loaded (base-ui uses data-slot, not role="radio")
    const hasQuestions = (await candidatePage.locator('[data-slot="radio-group-item"]').count()) > 0;
    if (!hasQuestions) {
      console.log("   (No questions visible — exam may have errored or still loading. Taking screenshot and continuing.)");
    }

    if (hasQuestions) {
      // 5. Answer some questions
      console.log("5. Answering questions...");
      const radioButtons = candidatePage.locator('[data-slot="radio-group-item"]');
      const radioCount = await radioButtons.count();
      // Click first option for first 5 questions (every 4th radio = option A)
      for (let i = 0; i < Math.min(20, radioCount); i += 4) {
        await radioButtons.nth(i).click();
        await sleep(200);
      }
      await candidatePage.evaluate(() => window.scrollTo(0, 0));
      await sleep(500);
      await candidatePage.screenshot({ path: `${SCREENSHOT_DIR}/22-candidate-exam-answering.png` });

      // 6. Scroll to bottom - submit area
      console.log("6. Submit area...");
      await candidatePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(500);
      await candidatePage.screenshot({ path: `${SCREENSHOT_DIR}/23-candidate-exam-bottom-submit.png` });

      // 7. Submit exam
      console.log("7. Submitting exam...");
      const submitBtns = candidatePage.locator("text=Submit Exam");
      await submitBtns.last().click();
      await candidatePage.waitForURL("**/candidate/results/**", { timeout: 15000 });
      await sleep(2000);

      // 8. Results page
      console.log("8. Results page...");
      await candidatePage.screenshot({ path: `${SCREENSHOT_DIR}/24-candidate-results-top.png` });

      // 9. Scroll to see question details
      console.log("9. Results details...");
      await candidatePage.evaluate(() => window.scrollTo(0, 400));
      await sleep(500);
      await candidatePage.screenshot({ path: `${SCREENSHOT_DIR}/25-candidate-results-questions.png` });

      // 10. Back to dashboard
      console.log("10. Back to dashboard with results...");
      await candidatePage.click("text=Back to Dashboard");
      await sleep(1500);
      await candidatePage.screenshot({ path: `${SCREENSHOT_DIR}/26-candidate-dashboard-with-results.png`, fullPage: true });
    } else {
      console.log("   Skipping exam interaction — questions did not load.");
    }
  } else {
    console.log("No live exams found for candidate. Ensure an exam is set to Live.");
    await candidatePage.screenshot({ path: `${SCREENSHOT_DIR}/20-candidate-no-exams.png`, fullPage: true });
  }

  // Candidate logout
  console.log("11. Candidate logout...");
  await candidatePage.click("text=Sign Out");
  await sleep(1000);
  await candidatePage.screenshot({ path: `${SCREENSHOT_DIR}/27-logged-out.png`, fullPage: true });

  await browser.close();
  console.log("\n=== SCREENSHOTS COMPLETE ===");
  console.log(`Screenshots saved to ${SCREENSHOT_DIR}/`);
}

main().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
