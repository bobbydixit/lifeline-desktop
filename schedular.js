import { isIntegrationLocked, isSessionValid } from "./integration.js";
import {watch} from './utils.js'
import config from './config.js';


async function handleSchedule() {
  if (isIntegrationLocked()) {
      return false;
  } 
  await isSessionValid();
}

watch(handleSchedule, config.pollFrequency);