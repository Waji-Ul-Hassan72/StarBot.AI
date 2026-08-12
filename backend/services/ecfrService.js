// services/ecfrService.js
const axios = require("axios");

const ecfrClient = axios.create({
  baseURL: process.env.ECFR_BASE_URL || "https://www.ecfr.gov/api",
  headers: {
    "Accept": "application/xml, text/xml, */*",
  },
  timeout: 300000, // 5 minutes timeout limit
});

async function getTitleXml(date, titleNumber, options = {}) {
  const { part } = options;
  const params = {};
  if (part) params.part = part;

  const response = await ecfrClient.get(
    `/versioner/v1/full/${date}/title-${titleNumber}.xml`,
    {
      params, // Automatically passes ?part=101 to eCFR API
      responseType: "text",
    }
  );
  return response.data;
}

module.exports = { ecfrClient, getTitleXml };