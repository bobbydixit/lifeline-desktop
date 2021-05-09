import fetch from "node-fetch";

const NetworkEndpoint = {
  lifeLineBackend: "http://localhost:5000",
};

function _fetch(url, opts = {}, auth = true) {
  let { headers = {}, ...restOpts } = opts;
  if (auth == true) {
    headers = {
      ...headers,
      authorization: "Bearer " + utilCurrentState.token,
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
  const response = await _fetch(
    NetworkEndpoint.lifeLineBackend + "/fetch/otp",
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
