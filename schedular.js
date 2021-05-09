import {
  isIntegrationLocked,
  isSessionValid,
  getAuthToken,
  fillPinCodeAndMarkForBooking,
} from "./integration.js";
import { getSchedule, publishEvent } from "./network.js";
import { watch } from "./utils.js";
import config from "./config.js";

async function handleSchedule() {
  try {
    if (isIntegrationLocked()) {
      console.log("inside waiting period");
      return false;
    }
    const sessionValid = await isSessionValid();
    if (sessionValid) {
      console.log("session is valid");
      const token = getAuthToken();
      console.log("appointment is valid");
      const centers = await getSchedule(token);
      if (centers.length > 0) {
        const center = centers[0];
        await publishEvent(config.userPhoneNumber, center);
        await fillPinCodeAndMarkForBooking(center.pincode);
      }
    }
  } catch (e) {
    console.log(e);
  }
}

watch(handleSchedule, config.pollFrequency);
