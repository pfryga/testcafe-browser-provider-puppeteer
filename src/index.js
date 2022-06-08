const puppeteer = require('puppeteer');

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    // Multiple browsers support
    isMultiBrowser: true,

    browser: null,

    openedPages: {},

    // Required - must be implemented
    // Browser control
    async openBrowser(id, pageUrl, browserName) {
        const browserArgs = browserName.split(':');
        if (!this.browser) {
            const launchArgs = {
                timeout: 10000,
            };

            const noSandboxArgs = ['--no-sandbox', '--disable-setuid-sandbox'];

            if (browserArgs.indexOf('no_sandbox') !== -1) {
                launchArgs.args = noSandboxArgs;
            } else if (browserName.indexOf('?') !== -1) {
                const userArgs = browserName.split('?');
                const params = userArgs[0];

                if (params === 'no_sandbox') {
                    launchArgs.args = noSandboxArgs;
                }

                const executablePath = userArgs[1];

                if (executablePath.length > 0) {
                    launchArgs.executablePath = executablePath;
                }
            }
            this.browser = await puppeteer.launch(launchArgs);
        }

        const page = await this.browser.newPage();

        const emulationArg = browserArgs.find((v) => /^emulate/.test(v));

        if (emulationArg) {
            const [, emulationDevice] = emulationArg.split('=');
            const device = puppeteer.devices[emulationDevice];

            if (!device) {
                throw new Error('Emulation device is not supported');
            }

            await page.emulate(device);
        }

        await page.goto(pageUrl, {waitUntil: 'networkidle0', timeout: 0});
        this.openedPages[id] = page;
    },

    async closeBrowser(id) {
        delete this.openedPages[id];
        await this.browser.close();
    },

    async isValidBrowserName() {
        return true;
    },

    async hasCustomActionForBrowser (/* browserId */) {
        return {
            hasCloseBrowser:                this.hasOwnProperty('closeBrowser'),
            hasResizeWindow:                this.hasOwnProperty('resizeWindow'),
            hasTakeScreenshot:              this.hasOwnProperty('takeScreenshot'),
            hasGetVideoFrameData:           this.hasOwnProperty('getVideoFrameData'),
            hasCanResizeWindowToDimensions: this.hasOwnProperty('canResizeWindowToDimensions'),
            hasMaximizeWindow:              this.hasOwnProperty('maximizeWindow'),
            hasChromelessScreenshots:       false,
        };
    },

    // Extra methods
    async resizeWindow(id, width, height) {
        await this.openedPages[id].setViewport({width, height});
    },

    async takeScreenshot(id, screenshotPath, width, height, fullPage) {
        await this.openedPages[id].screenshot({path: screenshotPath, fullPage});
        console.log(`please open ${screenshotPath} screenshot. For next 10 seconds created screenshot contains full page (proper behavior)`);
        await timeout(10000);
        console.log(`...and now open the same screenshot again (${screenshotPath}). Now it contains only visible in viewport part of page`);
    },
};
