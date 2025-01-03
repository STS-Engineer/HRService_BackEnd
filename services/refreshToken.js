const fetch = require("node-fetch");

async function getRefreshToken(refreshToken) {
  const response = await fetch(
    "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "{client_id}",
        client_secret: "{client_secret}",
        grant_type: "refresh_token",
        scope: "https://outlook.office365.com/.default",
        refresh_token: refreshToken,
      }),
    }
  );
  const data = await response.json();
  return data;
}

getRefreshToken("your_refresh_token").then(console.log);
