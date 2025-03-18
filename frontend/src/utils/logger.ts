const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data || "");
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || "");
  },
};

export default logger;
