import {
  isIntegrationLocked,
  isSessionValid,
  getAuthToken,
  fillPinCodeAndMarkForBooking,
} from "./integration.js";
import { getSchedule, publishEvent } from "./network.js";
import { watch } from "./utils.js";
import config from "./config.js";

let nextSearchIndex = 0

function updateNextSearchIndex() {
  nextSearchIndex = nextSearchIndex + 1;
  if (nextSearchIndex == config.districtIds.length) {
    nextSearchIndex = 0;
  }
}

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
        const presentDate = config.date
          ? config.date
          : moment(new Date()).tz("Asia/Kolkata").format("DD-MM-YYYY");
      updateNextSearchIndex();
      const centers = await getSchedule(
        token,
        presentDate,
        config.districtIds[nextSearchIndex]
      );
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
