import express from "express"
import axios from "axios"
import xml2js from "xml2js"
import fs from "fs"

const app = express()
const PORT = 4000

app.get("/sync-inventory", async (req, res) => {
  try {
    // 🧩 1️⃣ Prepare XML request to Tally for your custom report
    const tallyReq = `
      <ENVELOPE>
        <HEADER>
          <TALLYREQUEST>Export Data</TALLYREQUEST>
        </HEADER>
        <BODY>
          <EXPORTDATA>
            <REQUESTDESC>
              <REPORTNAME>StockItemExport</REPORTNAME>
              <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
              </STATICVARIABLES>
            </REQUESTDESC>
          </EXPORTDATA>
        </BODY>
      </ENVELOPE>
    `

    console.log("📤 Sending request to Tally (StockItemExport)…")

    // 🧩 2️⃣ Send to Tally running locally (port 9000)
    const tallyResp = await axios.post("http://localhost:9000/", tallyReq, {
      headers: { "Content-Type": "text/xml" },
      timeout: 30000,
    })

    const rawXML = tallyResp.data
    console.log("\n===== RAW XML (first 1000 chars) =====")
    console.log(rawXML.substring(0, 1000))
    console.log("=====================================\n")

    // 🧩 3️⃣ Handle multiple ENVELOPE blocks (Tally splits large data)
    const envelopes = rawXML.split(/<\/ENVELOPE>/i).filter((e) => e.trim().length > 0)
    let allItems = []

    for (const env of envelopes) {
      const xml = env.endsWith("</ENVELOPE>") ? env : env + "</ENVELOPE>"
      try {
        const parsedEnv = await xml2js.parseStringPromise(xml, { explicitArray: false })

        const names = parsedEnv?.ENVELOPE?.SINAMEFIELD || []
        const units = parsedEnv?.ENVELOPE?.SIBASEUNITFIELD || []
        const balances = parsedEnv?.ENVELOPE?.SICLOSINGBALFIELD || []
        const rates = parsedEnv?.ENVELOPE?.SIRATEFIELD || []
        const values = parsedEnv?.ENVELOPE?.SIVALUEFIELD || []

        const arrNames = Array.isArray(names) ? names : [names]
        const arrUnits = Array.isArray(units) ? units : [units]
        const arrBalances = Array.isArray(balances) ? balances : [balances]
        const arrRates = Array.isArray(rates) ? rates : [rates]
        const arrValues = Array.isArray(values) ? values : [values]

        const items = arrNames.map((_, i) => ({
          itemName: arrNames[i] || "",
          unit: arrUnits[i] || "",
          closingBalance: arrBalances[i] || "",
          rate: arrRates[i] || "",
          value: arrValues[i] || "",
        }))

        allItems = allItems.concat(items)
      } catch (err) {
        console.warn("⚠️ Skipped one envelope:", err.message)
      }
    }

    const inventory = allItems.filter((i) => i.itemName)
    console.log(`✅ Parsed ${inventory.length} Stock Items (from ${envelopes.length} envelopes)`)

    // 🧩 4️⃣ Save local JSON backup
    fs.writeFileSync("tallyInventory.json", JSON.stringify(inventory, null, 2))
    console.log("💾 Full inventory saved to tallyInventory.json")

    // 🧩 5️⃣ Optional: Sync with your live webapp
    try {
      const apiResp = await axios.post(
        "https://tallypos.syntegrateitsolutions.com/api/updateInventoryFromTally",
        { inventory },
        { headers: { "Content-Type": "application/json" } }
      )
      console.log("🌍 Synced with webapp:", apiResp.data)
    } catch (syncErr) {
      console.error("❌ Error syncing with webapp:", syncErr.message)
    }

    // 🧩 6️⃣ Display formatted response in browser
    res.setHeader("Content-Type", "text/html")
    res.send(`
      <html>
        <head><title>Tally Inventory Sync</title></head>
        <body style="background:#111;color:#0f0;font-family:monospace;padding:20px;">
          <h2>✅ Received ${inventory.length} Stock Items from Tally</h2>
          <pre>${JSON.stringify(inventory.slice(0, 50), null, 2).replace(/</g, "&lt;")}</pre>
          <p>💾 Full data saved to <b>tallyInventory.json</b></p>
          <p>🌍 Synced to webapp: <b>${inventory.length}</b> items</p>
        </body>
      </html>
    `)
  } catch (err) {
    console.error("❌ Error fetching from Tally:", err.message)
    res.status(500).send(`<pre>${err.message}</pre>`)
  }
})

app.listen(PORT, () =>
  console.log(`🚀 Bridge running → http://localhost:${PORT}/sync-inventory`)
)
