import puppeteer from "puppeteer";
import { sleep } from "./utils.js";
import { fetchOtp } from "./network.js";
import config from "./config.js";
const OTP_VALID_FOR = 120000;
const selectors = {
  mobileInput: "input[appmobilenumber=true]",
  pincodeInput: 'input[appinputchar="pincode"]',
  getOtp: "ion-button",
  otpInput: "#mat-input-1",
  verifyOtpButton: "ion-button",
  scheduleAppointmentButton: "register-btn schedule-appointment",
};

const BrowserState = {
  NOT_OPEN: 1,
  HOME: 2,
  WAITING_FOR_OTP: 3,
  AT_DASHBOARD: 4,
  AT_APPOINTMENT: 5,
};

const UrlToBrowserStateMapping = {
  "https://selfregistration.cowin.gov.in": [
    BrowserState.HOME,
    BrowserState.WAITING_FOR_OTP,
  ],
  "https://selfregistration.cowin.gov.in/dashboard": BrowserState.AT_DASHBOARD,
  "https://selfregistration.cowin.gov.in/appointment":
    BrowserState.AT_APPOINTMENT,
};

Object.freeze(BrowserState);
Object.freeze(UrlToBrowserStateMapping);

let defaultState = {
  currentBrowserState: BrowserState.NOT_OPEN,
  tokenValidity: 0,
  token: "",
  pauseTillToBookSlot: 0,
  otpValidFor: 0,
  currentBeneficiaries: [],
  requestedAt: 0,
};

let currentBrowser;
let currentPage;
let currentState = {
  ...defaultState,
};

async function wasBrowserKilled() {
  if (!currentBrowser) return true;
  const procInfo = await currentBrowser.process();
  if (!!procInfo.signalCode) {
    return true;
  }
  if (!currentPage) {
    await currentBrowser.close();
    return true;
  }
  return false;
}

async function validateCurrentBrowserState() {
  const url = await currentPage.url();
  return (
    UrlToBrowserStateMapping[url] &&
    UrlToBrowserStateMapping[url].includes(currentState.currentBrowserState)
  );
}

async function restartLoginJourney() {
  let browserKilled = await wasBrowserKilled();
  if (!browserKilled) {
    await currentBrowser.close();
  }
  console.log("restarting login activity");
  await initializeBrowser();
}

async function initializeBrowser() {
  currentState = { ...defaultState };
  currentBrowser = await puppeteer.launch({
    headless: false,
  });
  console.log("Browser initialized ");
  currentPage = await currentBrowser.newPage();
  await currentPage.goto("https://selfregistration.cowin.gov.in/");
  currentState.currentBrowserState = BrowserState.HOME;
  currentPage.on("response", requestInterceptor);
  console.log("Home Page Open Call initialized ");
  await currentPage.waitForSelector(selectors.mobileInput);
  await sleep(2000);
  await currentPage.type(selectors.mobileInput, config.userPhoneNumber);
  await currentPage.click(selectors.getOtp);
  //   await page.waitForNavigation();
  console.log("executing evaluate");
}

async function requestInterceptor(interceptedResponse) {
  const request = interceptedResponse.request();
  if (request.url().endsWith("/beneficiaries") && request.method() === "GET") {
    const headers = request.headers();
    const auth = headers["authorization"];
    console.log(auth);
    const response = await interceptedResponse.json();
    updateAuthAndBeneficiaries(response.beneficiaries, auth);
  } else if (request.url().endsWith("/generateMobileOTP")) {
    console.log("otp submitted");
    currentState.currentBrowserState = BrowserState.WAITING_FOR_OTP;
    currentState.requestedAt = Date.now();
    currentState.otpValidFor = Date.now() + OTP_VALID_FOR;
  }
}

function updateAuthAndBeneficiaries(beneficiaries, auth) {
  if (!currentState.token) {
    console.log("updating beneficiaries and token to ");
    console.log(beneficiaries);
    console.log(auth);
    currentState.currentBeneficiaries = beneficiaries;
    currentState.token = auth;
    currentState.tokenValidity = Date.now() + config.tokenValidity;
  }
}

async function processOtp(otp) {
  console.log("attempting to process otp")
  await currentPage.type(selectors.otpInput, otp);
  await Promise.all([
    currentPage.waitForNavigation(),
    currentPage.click(selectors.verifyOtpButton),
  ]);
}

export function isIntegrationLocked() {
  return currentState.pauseTillToBookSlot > Date.now();
}

export async function isSessionValid() {
  if (currentState.tokenValidity < Date.now()) {
    console.log("token expired");
    console.log(currentState.currentBrowserState);
    switch (currentState.currentBrowserState) {
      case BrowserState.WAITING_FOR_OTP:
        if (currentState.otpValidFor > Date.now()) {
          // fetch latest otp and attempt submit
          const otp = await fetchOtp();
          if (otp) {
            await processOtp(otp);
          }
        } else {
          await restartLoginJourney();
        }
        break;
      // otp handle vaala clauses
      default:
        console.log("token is not valid");
        await restartLoginJourney();
    }

    return false;
  }
}
