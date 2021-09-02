// Importing deps
const core = require("@actions/core");
const github = require("@actions/github");
const fetch = require("node-fetch");

const appcenterApiVersion = "v0.1";

const Adapter = {
  /**
   *
   * @param {string} appName the name of the app
   * @param {string} ownerName the name of the company that owns the app
   * @param {string} branchName the name of the branch
   * @param {object} params build params
   * @param {string} apiToken api token
   * @param {object} additionalHeaders additional headers to send
   * @returns JSON response of the appcenter /builds api
   * @throws
   */
  buildApp: async (
    appName,
    ownerName,
    branchName,
    params,
    apiToken,
    additionalHeaders = {}
  ) => {
    return fetch(
      `https://api.appcenter.ms/${appcenterApiVersion}/apps/${ownerName}/${appName}/branches/${branchName}/builds`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-type": "application/json",
          "X-API-Token": apiToken,
          ...additionalHeaders,
        },
        body: JSON.stringify(params),
      }
    ).then(async (res) => {
      const json = await res.json();
      if (json.error) {
        throw json.error;
      }
      return json;
    });
  },
  /**
   *
   * @param {string} companyName the company name
   * @returns JSON response of the appcenter /orgs/:companyName/apps api
   */
  getAllApps: async (companyName, apiToken) => {
    return fetch(`https://api.appcenter.ms/v0.1/orgs/${companyName}/apps`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-type": "application/json",
        "X-API-Token": apiToken,
      },
    }).then(async (res) => {
      const json = await res.json();
      if (json.error) {
        throw json.error;
      }
      return json;
    });
  },
};

const Utility = {
  getAppInfoObject: (serverObj) => {
    return serverObj.map((curr) => {
      return { appName: curr.name, displayName: curr.display_name };
    });
  },
  getBranchName: (str) => {
    const toArr = str.split("/");
    toArr.splice(0, 2);
    return toArr.join("/");
  },
};

const run = async (appcenterToken, companyName) => {
  try {
    const appsObj = await Adapter.getAllApps(companyName, appcenterToken);
    const apps = Utility.getAppInfoObject(appsObj);
    apps.forEach(async (element) => {
      console.log(`Evaluating app ${element.displayName}`);
      try {
        const res = await Adapter.buildApp(
          element.appName,
          companyName,
          encodeURIComponent(Utility.getBranchName(github.context.payload.ref)),
          {
            sourceVersion: github.context.payload.head_commit.id,
            debug: false,
          },
          appcenterToken
        );
        console.log(
          `Success in sending build request for app ${element.displayName}`,
          JSON.stringify(res)
        );
      } catch (error) {
        console.warn(
          `Found an error while sending build request for app ${element.displayName}, skipping`,
          error
        );
      }
    });
  } catch (error) {
    console.error("Failure in getting apps, aborting", error);
  }
};

run(core.getInput("appcenter-token"), core.getInput("company-name"));
