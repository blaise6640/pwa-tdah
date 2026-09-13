import APP_CONFIG from "../app.config";

const getBackendUrl = () => {
  const url = APP_CONFIG.backendUrl;

  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    console.warn("⚠️ backendUrl mal configuré dans APP_CONFIG :", url);
    return "";
  }

  return url;
};

export default getBackendUrl;
