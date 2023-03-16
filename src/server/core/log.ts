enum LogMessageLevel {
  ERROR = "error",
  INFO = "info",
  DEBUG = "debug",
  WARNING = "warning"
}

function addLogMessageMetadata(
  message: string | undefined,
  level: LogMessageLevel
) {
  let date = new Date();
  let dateAsString: string = date.toISOString();
  let logLevel: string = "";

  switch (level) {
    case "error": {
      logLevel = "ERROR";
      break;
    }
    case "info": {
      logLevel = "INFO";
      break;
    }
    case "warning": {
      logLevel = "WARNING";
      break;
    }
    case "debug": {
      logLevel = "DEBUG";
      break;
    }
    default: {
      logLevel = "???";
      break;
    }
  }

  return "[" + dateAsString + " " + logLevel + "] " + message;
}

export { addLogMessageMetadata, LogMessageLevel };
