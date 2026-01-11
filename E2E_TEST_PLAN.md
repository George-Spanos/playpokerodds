# Playwright E2E Test Suite - Implementation Plan

> **Purpose**: This document outlines the step-by-step implementation of a
> comprehensive Playwright e2e test suite for the playpokerodds application
> before the Angular/Express → Go + Vanilla JS migration.

---

## Overview

### Goals

1. **Full Feature Coverage**: Test all user-facing flows and functionality
2. **Migration Confidence**: Ensure all behaviors are documented and verified
   before migration
3. **Maintainability**: Create a well-organized, reusable test structure
4. **CI Integration**: Enable automated testing in GitHub Actions

### Application Features to Cover

| Feature Area   | Routes               | Key Functionality                                       |
| -------------- | -------------------- | ------------------------------------------------------- |
| Homepage       | `/`                  | Demo gif display, "Play now" navigation                 |
| Play Game      | `/play`, `/play/:id` | Poker table rendering, odds guessing, answer submission |
| Authentication | N/A (modal)          | Login, register, logout, token refresh                  |
| Leaderboards   | `/leaderboards`      | User scores display, ranking, navigation to profiles    |
| User Profile   | `/profile/:username` | Profile view, history, favorites, settings              |
| About          | `/about`             | Static info page                                        |

### Key Decisions

- **Test Data**: Seed test users (don't rely on existing data)
- **Selectors**: Add `data-testid` attributes to Angular components for
  reliability during migration

---

## Phase 1: Infrastructure Setup

### Step 1.1: Install Playwright

```bash
# From project root
npm init -y  # If no package.json exists
npm install -D @playwright/test
npx playwright install
```

### Step 1.2: Create playwright.config.ts

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "html",
    use: {
        baseURL: "http://localhost:4200",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ],
    webServer: {
        command: "docker compose up -d && cd src/ui && npm run start",
        url: "http://localhost:4200",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
});
```

### Step 1.3: Create Directory Structure

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts      # Auth state fixtures
│   └── test-data.ts         # Test users, rounds data
├── pages/
│   ├── base.page.ts         # Base page object
│   ├── home.page.ts         # Homepage PO
│   ├── play.page.ts         # Play game PO
│   ├── leaderboards.page.ts # Leaderboards PO
│   ├── profile.page.ts      # User profile PO
│   └── auth.page.ts         # Auth modal PO
├── tests/
│   ├── home.spec.ts
│   ├── play.spec.ts
│   ├── auth.spec.ts
│   ├── leaderboards.spec.ts
│   └── profile.spec.ts
└── utils/
    ├── api-helpers.ts       # API seeding utils
    └── auth-helpers.ts      # Login/register helpers
```

### Step 1.4: Add npm scripts to root package.json

```json
{
    "scripts": {
        "e2e": "playwright test",
        "e2e:ui": "playwright test --ui",
        "e2e:debug": "playwright test --debug",
        "e2e:headed": "playwright test --headed"
    }
}
```

### Step 1.5: Create Base Page Object

```typescript
// e2e/pages/base.page.ts
import { Page } from "@playwright/test";

export class BasePage {
    constructor(protected page: Page) {}

    async navigateTo(path: string) {
        await this.page.goto(path);
    }

    async waitForLoad() {
        await this.page.waitForLoadState("networkidle");
    }

    get topBar() {
        return {
            homeLink: this.page.getByTestId("nav-home"),
            playLink: this.page.getByTestId("nav-play"),
            leaderboardsLink: this.page.getByTestId("nav-leaderboards"),
            aboutLink: this.page.getByTestId("nav-about"),
            userStatus: this.page.getByTestId("user-status"),
        };
    }
}
```

### Step 1.6: Create Test Data Fixtures

```typescript
// e2e/fixtures/test-data.ts
export const testUsers = {
    validUser: {
        email: "e2e-test@playpokerodds.com",
        username: "e2etest",
        password: "TestPassword123!",
    },
    newUser: {
        email: () => `newuser${Date.now()}@test.com`,
        username: () => `user${Date.now()}`,
        password: "NewPassword123!",
    },
};
```

### Step 1.7: Verify Setup with Empty Test

```typescript
// e2e/tests/smoke.spec.ts
import { expect, test } from "@playwright/test";

test("should load homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Play Poker Odds/i);
});
```

**Verification**: Run `npm run e2e` - should pass.

---

## Phase 2: Homepage Tests

### Step 2.1: Add data-testid to Homepage

Edit `src/ui/src/app/home/homepage.component.ts`:

```html
<div class="homepage-content">
    <h1 class="title" data-testid="homepage-title">Play Poker Odds!</h1>
    <img
        class="demo"
        data-testid="demo-gif"
        src="/assets/demo.gif"
        alt="How to play"
    />
    <h3 class="moto" data-testid="homepage-motto">
        Forget about bets. Focus on winning chances
    </h3>
    <button
        class="primary md"
        data-testid="play-now-btn"
        (click)="navigateToPlay()"
    >
        Play now
    </button>
</div>
```

### Step 2.2: Add data-testid to Top Bar

Edit `src/ui/src/app/top-bar/top-bar.component.html`:

```html
<div class="nav-item" [routerLink]="['/']" data-testid="nav-home">...</div>
<div class="nav-item" [routerLink]="['/play']" data-testid="nav-play">...</div>
<div
    class="nav-item"
    [routerLink]="['/leaderboards']"
    data-testid="nav-leaderboards"
>
    ...
</div>
<div class="nav-item" [routerLink]="['/about']" data-testid="nav-about">
    ...
</div>
```

### Step 2.3: Create Home Page Object

```typescript
// e2e/pages/home.page.ts
import { expect, Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class HomePage extends BasePage {
    readonly title = this.page.getByTestId("homepage-title");
    readonly demoGif = this.page.getByTestId("demo-gif");
    readonly motto = this.page.getByTestId("homepage-motto");
    readonly playNowButton = this.page.getByTestId("play-now-btn");

    async goto() {
        await this.navigateTo("/");
    }

    async clickPlayNow() {
        await this.playNowButton.click();
    }

    async expectPageLoaded() {
        await expect(this.title).toContainText("Play Poker Odds");
        await expect(this.demoGif).toBeVisible();
        await expect(this.playNowButton).toBeVisible();
    }
}
```

### Step 2.4: Create Home Tests

```typescript
// e2e/tests/home.spec.ts
import { expect, test } from "@playwright/test";
import { HomePage } from "../pages/home.page";

test.describe("Homepage", () => {
    let homePage: HomePage;

    test.beforeEach(async ({ page }) => {
        homePage = new HomePage(page);
        await homePage.goto();
    });

    test("should display main content", async () => {
        await homePage.expectPageLoaded();
        await expect(homePage.motto).toContainText("Focus on winning chances");
    });

    test("should navigate to play page via Play Now button", async ({ page }) => {
        await homePage.clickPlayNow();
        await expect(page).toHaveURL(/\/play/);
    });

    test("should have working navigation links", async ({ page }) => {
        await homePage.topBar.leaderboardsLink.click();
        await expect(page).toHaveURL(/\/leaderboards/);

        await homePage.topBar.aboutLink.click();
        await expect(page).toHaveURL(/\/about/);

        await homePage.topBar.homeLink.click();
        await expect(page).toHaveURL(/\/$/);
    });
});
```

---

## Phase 3: Play Game Tests (Critical Path)

### Step 3.1: Add data-testid to Play Components

**play.component.ts**:

```html
<div class="container" data-testid="play-container">
    <div class="play-area" data-testid="play-area">
        <ppo-revealed-cards-toggle
            data-testid="cards-toggle"
        ></ppo-revealed-cards-toggle>
        <ppo-poker-table
            data-testid="poker-table"
            [round]="round()"
        ></ppo-poker-table>
        <ppo-guess-box data-testid="guess-box"></ppo-guess-box>
    </div>
</div>
```

**guess-box.component.html** - Add data-testid to:

- Estimate input: `data-testid="estimate-input"`
- Submit button: `data-testid="submit-btn"`
- Result display: `data-testid="round-result"`

### Step 3.2: Create Play Page Object

```typescript
// e2e/pages/play.page.ts
import { expect, Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class PlayPage extends BasePage {
    readonly pokerTable = this.page.getByTestId("poker-table");
    readonly guessBox = this.page.getByTestId("guess-box");
    readonly estimateInput = this.page.getByTestId("estimate-input");
    readonly submitButton = this.page.getByTestId("submit-btn");
    readonly roundResult = this.page.getByTestId("round-result");

    async goto() {
        await this.navigateTo("/play");
    }

    async enterGuess(estimate: number) {
        await this.estimateInput.fill(String(estimate));
    }

    async submitGuess() {
        await this.submitButton.click();
    }

    async expectTableVisible() {
        await expect(this.pokerTable).toBeVisible();
        await expect(this.guessBox).toBeVisible();
    }

    async expectResultDisplayed() {
        await expect(this.roundResult).toBeVisible({ timeout: 30000 });
    }
}
```

### Step 3.3: Create Play Tests

```typescript
// e2e/tests/play.spec.ts
import { expect, test } from "@playwright/test";
import { PlayPage } from "../pages/play.page";

test.describe("Play Game", () => {
    let playPage: PlayPage;

    test.beforeEach(async ({ page }) => {
        playPage = new PlayPage(page);
        await playPage.goto();
    });

    test("should display poker table and guess box", async () => {
        await playPage.expectTableVisible();
    });

    test("should allow entering an odds estimate", async () => {
        await playPage.enterGuess(50);
        await expect(playPage.estimateInput).toHaveValue("50");
    });

    test("should submit guess and show result", async () => {
        await playPage.enterGuess(45);
        await playPage.submitGuess();
        await playPage.expectResultDisplayed();
    });
});
```

---

## Phase 4: Authentication Tests

### Step 4.1: Identify Auth Modal Components

Locate auth modal in top-bar/user-status component and add data-testid
attributes:

- Login button trigger: `data-testid="login-btn"`
- Register button trigger: `data-testid="register-btn"`
- Email input: `data-testid="auth-email"`
- Username input: `data-testid="auth-username"`
- Password input: `data-testid="auth-password"`
- Submit button: `data-testid="auth-submit"`
- Error message: `data-testid="auth-error"`
- Logout button: `data-testid="logout-btn"`
- Username display: `data-testid="logged-in-username"`

### Step 4.2: Create API Seeding Utility

```typescript
// e2e/utils/api-helpers.ts
import { APIRequestContext } from "@playwright/test";

const API_URL = "http://localhost:3000";

export async function seedTestUser(request: APIRequestContext, user: {
    email: string;
    username: string;
    password: string;
}) {
    try {
        const response = await request.post(`${API_URL}/auth/register`, {
            data: user,
        });
        return response.json();
    } catch (e) {
        // User may already exist
        return null;
    }
}

export async function loginUser(
    request: APIRequestContext,
    email: string,
    password: string,
) {
    const response = await request.post(`${API_URL}/auth/login`, {
        data: { email, password },
    });
    return response.json();
}
```

### Step 4.3: Create Auth Page Object and Tests

Similar pattern to above - create page object with selectors and tests for:

- Login success/failure
- Registration success/duplicate email handling
- Logout
- Token persistence (refresh)

---

## Phase 5: Leaderboards Tests

### Step 5.1: Add data-testid to Leaderboards

Edit `leaderboards.component.html`:

- Table: `data-testid="leaderboards-table"`
- My score row: `data-testid="my-score-row"`
- User rows: `data-testid="leaderboard-row"`

### Step 5.2: Create Tests

- Verify table displays
- Verify click navigates to profile
- Verify logged-in user score is highlighted

---

## Phase 6: Profile Tests

### Step 6.1: Add data-testid to Profile Components

- Profile container: `data-testid="profile-container"`
- History tab: `data-testid="history-tab"`
- Favorites tab: `data-testid="favorites-tab"`
- Settings tab: `data-testid="settings-tab"`

### Step 6.2: Create Tests

- Verify profile loads for valid user
- Verify navigation to history/favorites
- Verify settings only visible for own profile
- Verify redirect for non-existent user

---

## Phase 7: CI Integration

### Step 7.1: Create GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
    push:
        branches: [main, develop]
    pull_request:
        branches: [main]

jobs:
    e2e:
        runs-on: ubuntu-latest
        timeout-minutes: 30

        steps:
            - uses: actions/checkout@v4

            - uses: actions/setup-node@v4
              with:
                  node-version: "20"

            - name: Install dependencies
              run: npm ci

            - name: Install Playwright Browsers
              run: npx playwright install --with-deps

            - name: Start services
              run: docker compose up -d

            - name: Wait for services
              run: npx wait-on http://localhost:4200 http://localhost:3000/health --timeout 120000

            - name: Run Playwright tests
              run: npm run e2e

            - uses: actions/upload-artifact@v4
              if: always()
              with:
                  name: playwright-report
                  path: playwright-report/
                  retention-days: 30
```

---

## Checklist

- [ ] **Phase 1**: Infrastructure Setup
  - [ ] Install Playwright
  - [ ] Create config and directory structure
  - [ ] Create base page object
  - [ ] Verify smoke test passes

- [ ] **Phase 2**: Homepage Tests
  - [ ] Add data-testid attributes
  - [ ] Create page object
  - [ ] Create and verify tests

- [ ] **Phase 3**: Play Game Tests
  - [ ] Add data-testid attributes
  - [ ] Create page object
  - [ ] Create and verify tests

- [ ] **Phase 4**: Authentication Tests
  - [ ] Add data-testid attributes
  - [ ] Create seeding utilities
  - [ ] Create page object
  - [ ] Create and verify tests

- [ ] **Phase 5**: Leaderboards Tests
  - [ ] Add data-testid attributes
  - [ ] Create and verify tests

- [ ] **Phase 6**: Profile Tests
  - [ ] Add data-testid attributes
  - [ ] Create and verify tests

- [ ] **Phase 7**: CI Integration
  - [ ] Create GitHub Actions workflow
  - [ ] Verify tests pass in CI
