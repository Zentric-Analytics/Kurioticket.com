/** @type {import('expo/fingerprint').Config} */
const config = {
  // Expo Autolinking discovers local modules from ./modules, but the Preview
  // release identity must also change when local native source changes. Keep
  // this platform-scoped so an Apple-only module does not force Android builds.
  extraSources: process.env.EAS_BUILD_PLATFORM?.trim().toLowerCase() === "ios"
    ? [
        {
          type: "dir",
          filePath: "modules/kurioticket-passkey-autofill",
          reasons: ["Kurioticket local iOS passkey AutoFill native module"],
        },
      ]
    : [],
};

module.exports = config;
