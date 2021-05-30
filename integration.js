import puppeteer from "puppeteer";
import { sleep } from "./utils.js";
import { fetchOtp } from "./network.js";
import player from "play-sound";
const playerInitialized = player({});
import config from "./config.js";
const OTP_VALID_FOR = 120000;
const selectors = {
  mobileInput: "input[appmobilenumber=true]",
  pincodeInput: 'input[appinputchar="pincode"]',
  pinSearchButton: ".pin-search-btn",
  getOtp: ".next-btn",
  otpInput: "#mat-input-1",
  verifyOtpButton: "ion-button",
  scheduleAppointmentButton: ".schedule-appointment",
};

const BrowserState = {
  NOT_OPEN: 1,
  HOME: 2,
  WAITING_FOR_OTP: 3,
  AT_DASHBOARD: 4,
  AT_APPOINTMENT: 5,
};

const UrlToLoginStatusMapping = {
  "https://selfregistration.cowin.gov.in/": false,
  "https://selfregistration.cowin.gov.in/dashboard": true,
  "https://selfregistration.cowin.gov.in/appointment": true,
};

Object.freeze(BrowserState);
Object.freeze(UrlToLoginStatusMapping);

let defaultState = {
  currentBrowserState: BrowserState.NOT_OPEN,
  tokenValidity: 0,
  token: "",
  pauseTillToBookSlot: 0,
  otpValidFor: 0,
  otpRequestedAt: 0,
  pincodeEntered: true,
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

async function validateUserIsLoggedIn() {
  const url = await currentPage.url();
  console.log(url);
  return UrlToLoginStatusMapping[url];
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
    currentState.currentBrowserState = BrowserState.AT_DASHBOARD;
  } else if (request.url().endsWith("/generateMobileOTP")) {
    console.log("otp submitted");
    currentState.currentBrowserState = BrowserState.WAITING_FOR_OTP;
    currentState.otpRequestedAt = Date.now();
    currentState.otpValidFor = Date.now() + OTP_VALID_FOR;
  } else if (request.url().endsWith("/states")) {
    console.log("states called");
    currentState.currentBrowserState = BrowserState.AT_APPOINTMENT;
  }
}

function updateAuthAndBeneficiaries(beneficiaries, auth) {
  if (!currentState.token) {
    console.log("updating beneficiaries and token to ");
    console.log(beneficiaries);
    console.log(auth);
    currentState.token = auth;
    currentState.tokenValidity = Date.now() + config.tokenValidity;
  }
}

async function processOtp(otp) {
  console.log("attempting to process otp");
  await currentPage.type(selectors.otpInput, otp.toString());
  await currentPage.click(selectors.verifyOtpButton);
}

async function takeUserToAppointmentScreen() {
  if (currentState.currentBrowserState != BrowserState.AT_DASHBOARD) return;
  console.log("executing evaluate");
  console.log(config);
  await selectAllBeneficiary(config.beneficiaryIds);
  // if(config.dose == 1) {
  //   await currentPage.click(selectors.scheduleAppointmentButton);
  // }
}

async function selectAllBeneficiary(beneficiaries){
  beneficiaries.forEach(benefId=> {
    currentPage.evaluate(evaluateForSelectionButton, benefId);
  });
}

async function evaluateForSelectionButton(beneficiaryId) {
  let nameBlocks1 = document.getElementsByClassName("name-block");
  let toBeUsedBlock;
  for (i = 0; i < nameBlocks1.length; i++) {
    if (nameBlocks1[i].children[1].innerText.includes(beneficiaryId)) {
      console.log("found");
      console.log(i);
      toBeUsedBlock = i;
    }
  }
  if (toBeUsedBlock == undefined) {
    console.log("entity Not Found");
    throw "Beneficiary Not Found";
  }

  const childIndex =
    document.getElementsByClassName("cardblockcls md hydrated")[toBeUsedBlock]
      .children.length - 1;

  document
    .getElementsByClassName("cardblockcls md hydrated")
    [toBeUsedBlock]
    .children[childIndex]
    .children[1]
    .children[0]
    .children[0]
    .children[0]
    .click();
}

export async function fillPinCodeAndMarkForBooking(pinCode) {
  console.log("searching pincode");
  await currentPage.type(selectors.pincodeInput, pinCode.toString());
  await currentPage.click(selectors.pinSearchButton);
  console.log("pincode search clicked");
  currentState.pincodeEntered = true;
  currentState.pauseTillToBookSlot = Date.now() + config.lockInPeriod;
  playerInitialized.play("alert.mp3", function (err) {
    if (err) console.log(err);
  });
}

export function isIntegrationLocked() {
  return currentState.pauseTillToBookSlot > Date.now();
}

export function getAuthToken() {
  return currentState.token;
}

async function refreshIfNeeded() {
  if(currentState.pincodeEntered) {
    await currentPage.reload({
    });
    currentState.pincodeEntered = false;
  }
}

export async function isSessionValid() {
  if (currentState.tokenValidity < Date.now()) {
    console.log("token expired");
    console.log(currentState.currentBrowserState);
    switch (currentState.currentBrowserState) {
      case BrowserState.WAITING_FOR_OTP:
        if (currentState.otpValidFor > Date.now()) {
          // fetch latest otp and attempt submit
          const otp = await fetchOtp(
            config.userPhoneNumber,
            currentState.otpRequestedAt
          );
          if (otp) {
            console.log(otp);
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
  
  const userLoggedIn = await validateUserIsLoggedIn();
  if (!userLoggedIn) {
    await restartLoginJourney();
    return false;
  }
  await takeUserToAppointmentScreen();
  await refreshIfNeeded();
  return true;
}
