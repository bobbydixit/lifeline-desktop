const puppeteer = require("puppeteer");

const selectors = {
  mobileInput: "input[appmobilenumber=true]",
  pincodeInput: "input[appinputchar=\"pincode\"]",
  getOtp: "ion-button",
  otpInput: "#mat-input-1",
  verifyOtpButton: "ion-button",
  scheduleAppointmentButton: "register-btn schedule-appointment",
};

function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

(async () => {
  //   const config = require("./config.json");

  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto("https://selfregistration.cowin.gov.in/");

  await page.waitForSelector(selectors.mobileInput);
  await sleep(2000);
  await page.type(selectors.mobileInput, "8123327941");
  await page.click(selectors.getOtp);
  //   await page.waitForNavigation();
  console.log("executing evaluate");
  //   await sleep(1000);

  console.log("navigation successful");
  page.on("response", async (interceptedResponse) => {
    const request = interceptedResponse.request();

    if (
      request.url().endsWith("/beneficiaries") &&
      request.method() === "GET"
    ) {
      const headers = request.headers();

      const auth = headers["authorization"];
      console.log(auth);

      // console.log(auth);

      const response = await interceptedResponse.json();
      // console.log(response);

      // config.auth = auth;

      console.log(response.beneficiaries);
      // const beneficiary = response.beneficiaries.find(
      //   (b) => b.name === config.name
      // );

      // config.beneficiary_reference_id = beneficiary.beneficiary_reference_id;

      // if (beneficiary.appointments.length) {
      //   config.appointment_id = beneficiary.appointments[0].appointment_id;
      await sleep(10000);
      console.log("executing evaluate");
      await page.evaluate(() => {
        document
          .getElementsByClassName("dose-data md hydrated")[6]
          .children[1].children[0].children[0].children[0].click();
      });
      await sleep(1000);
      await page.evaluate(() => {
        document
          .getElementsByClassName("register-btn schedule-appointment")[0]
          .click();
      });
      await sleep(60000);

      await browser.close();
    }

    // fs.writeFileSync("config.json", JSON.stringify(config, null, 2));

    // await browser.close();
  });
  //   await page.type(selectors.mobileInput, config.phone);
  //   await page.click(selectors.getOtp);
  //   const otp = await waitForSms();

  //   await page.type(selectors.otpInput, otp);

  //   page.on('response', async (interceptedResponse) => {
  //     const request = interceptedResponse.request();

  //     if (
  //       request.url().endsWith('/beneficiaries') &&
  //       request.method() === 'GET'
  //     ) {
  //       const headers = request.headers();

  //       const auth = headers['authorization'];

  //       // console.log(auth);

  //       const response = await interceptedResponse.json();
  //       // console.log(response);

  //       config.auth = auth;

  //       const beneficiary = response.beneficiaries.find(
  //         (b) => b.name === config.name
  //       );

  //       config.beneficiary_reference_id = beneficiary.beneficiary_reference_id;

  //       if (beneficiary.appointments.length) {
  //         config.appointment_id = beneficiary.appointments[0].appointment_id;
  //       }

  //       fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

  //       await browser.close();
  //     }
  //   });

  //   await Promise.all([
  //     page.waitForNavigation(),
  //     page.click(selectors.verifyOtpButton),
  //   ]);

  //   await sleep(5000);
})();
