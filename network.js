import fetch from "node-fetch";
import config from "./config.js";
import moment from "moment-timezone";
import {sleep} from "./utils.js"

function _fetch(url, opts = {}, auth = true) {
  let { headers = {}, ...restOpts } = opts;
  if (auth == true) {
    headers = {
      ...headers,
    };

    restOpts = {
      ...restOpts,
      credentials: "include",
    };
  } else {
    restOpts = {
      ...restOpts,
      credentials: "omit",
    };
  }
  return fetch(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
      "content-type": "application/json",
      "sec-ch-ua":
        '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
      "sec-ch-ua-mobile": "?0",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      ...headers,
    },
    referrer: "https://selfregistration.cowin.gov.in/",
    referrerPolicy: "strict-origin-when-cross-origin",
    body: null,
    method: "GET",
    mode: "cors",
    ...restOpts,
  });
}

export async function fetchOtp(mobileNumber, requestedAt) {
  console.log(`{"mobileNumber":${mobileNumber},"requestedAt":${requestedAt}}`);
  const response = await _fetch(
    config.lifeLineBackend + "/fetch/otp",
    {
      headers: {
        "content-type": "application/json",
      },
      body: `{"mobileNumber":${mobileNumber},"requestedAt":${requestedAt}}`,
      method: "POST",
    },
    false
  ).catch((e) => {
    console.log(e);
    return e;
  });
  if (response.status && response.status === 200) {
    const json = await response.json();
    console.log("fetch otp request succeded with response");
    console.log(json);
    if (json.success == true) {
      return json.otp;
    }
    return "";
  } else {
    console.log(`otp not found and it returned status ${response.status}`);
    return "";
  }
}

export async function publishEvent(mobileNumber, centerDetails) {
  const response = await _fetch(
    config.lifeLineBackend + "/submit/notification",
    {
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        type: "BOOKING_AVAILABLE",
        mobileNumber: mobileNumber,
        centerDetails: centerDetails,
      }),
      method: "POST",
    },
    false
  ).catch((e) => {
    console.log(e);
    return e;
  });
  if (response.status && response.status === 200) {
    const json = await response.json();
    if (json.success == true) {
      console.log("Publish event succeded");
      return true;
    }
    return false;
  } else {
    console.log("Publish event failed");
    return false;
  }
}

export async function getSchedule(auth) {
  const presentDate = moment(new Date())
    .tz("Asia/Kolkata")
    .format("DD-MM-YYYY");
  await sleep(Math.floor(Math.random() * (3000 - 500 + 1) + 500));
  console.log(
    `${config.cowinBackend}/api/v2/appointment/sessions/calendarByDistrict?district_id=${config.districtId}&date=${presentDate}`
  );
  console.log(auth);
  const response = await _fetch(
    `${config.cowinBackend}/api/v2/appointment/sessions/calendarByDistrict?district_id=${config.districtId}&date=${presentDate}`,
    {
      headers: {
        "content-type": "application/json",
        authorization: auth,
      },
    }
  ).catch((e) => {
    console.log(e);
    return e;
  });
  const json = await response.json();
  if (json.centers) {
    const centers = processCenters(json.centers);
    console.log("processed centers ");
    console.log(centers);
    return centers;
  } else {
    console.log(`schedule failed with response ${json}`);
    console.log(JSON.stringify(json));
    return [];
  }
}

function processCenters(centers) {
  if (!centers) {
    console.log(`centers dont exist ${centers}`);
  }
  centers = centers.map((center) => {
    let sessions = center.sessions;
    return {
      ...center,
      sessions: sessionFilter(sessions),
    };
  });
  centers = centers.filter((center) => {
    return center.sessions.length > 0;
  });
  return centers;
}

function sessionFilter(sessions) {
  return sessions.filter((session) => {
    if (
      parseInt(session.available_capacity) > config.minimumAvailability &&
      parseInt(session.min_age_limit) < 45
    ) {
        console.log("Session: ", session)
      return true;
    }
    return false;
  });
}
