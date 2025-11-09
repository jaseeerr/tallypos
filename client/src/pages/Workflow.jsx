import React from "react";
import {
  Info,
  Cpu,
  Link as LinkIcon,
  Shuffle,
  Clock,
  Code,
  Users,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";

export default function Workflow() {
  return (
    <div className="bg-gray-50 text-gray-800 font-inter min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white py-6 shadow">
        <h1 className="text-center text-3xl font-bold tracking-wide">
          🔄 Tally ↔ Node.js ↔ MERN Sync System
        </h1>
        <p className="text-center text-sm mt-2 opacity-80">
          Multi-company real-time integration (Company A & B)
        </p>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-10">
        {/* Overview */}
        <Section icon={<Info />} title="Overview">
          <p className="leading-relaxed">
            This system synchronizes data between two{" "}
            <strong>Tally companies</strong> (running on different ports) and a{" "}
            <strong>remote VPS MERN app</strong>. Each Tally instance exposes
            REST-like APIs via TDL, while a local Node.js agent bridges data
            both ways using a 1-minute cron schedule.
          </p>
        </Section>

        {/* Components */}
        <Section icon={<Cpu />} title="System Components">
          <table className="table-auto w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Component</th>
                <th className="p-2 border">Role</th>
              </tr>
            </thead>
            <tbody>
              <Row name="Tally Instance A" role="Company A (port 9000)" />
              <Row name="Tally Instance B" role="Company B (port 9001)" />
              <Row
                name="TDL Layer"
                role={
                  <>
                    Exposes <code>/getInventory</code>,{" "}
                    <code>/getCustomers</code>, <code>/addSale</code>
                  </>
                }
              />
              <Row
                name="Local Node.js Service"
                role="Bridge between Tally and VPS"
              />
              <Row name="VPS MERN App" role="Central cloud database + UI" />
            </tbody>
          </table>
        </Section>

        {/* APIs */}
        <Section icon={<LinkIcon />} title="API Summary">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-indigo-600 mb-2">
                Local Tally APIs
              </h3>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                <li>
                  <code>GET /getInventory</code> – Fetch item stock
                </li>
                <li>
                  <code>GET /getCustomers</code> – Fetch customer ledgers
                </li>
                <li>
                  <code>POST /addSale</code> – Insert sale & return invoice no.
                </li>
              </ul>
              <p className="mt-2 text-xs text-gray-600">
                Company A → localhost:9000 | Company B → localhost:9001
              </p>
            </div>
            <div>
              <h3 className="font-bold text-blue-600 mb-2">Cloud VPS APIs</h3>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                <li>
                  <code>POST /sync/inventory</code>
                </li>
                <li>
                  <code>POST /sync/customers</code>
                </li>
                <li>
                  <code>GET /tally/pending-sales</code>
                </li>
                <li>
                  <code>POST /tally/confirm-sale</code>
                </li>
                <li>
                  <code>PATCH /tally/mark-processing</code> – new intermediate
                  state
                </li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Data Flow */}
        <Section icon={<Shuffle />} title="Data Flow">
          <pre className="bg-gray-900 text-green-300 text-xs p-4 rounded-lg overflow-x-auto">
{`┌─────────────┐        ┌──────────────┐        ┌───────────────┐
│  Tally A    │◄──────►│  Node Agent  │◄──────►│  VPS (MERN)   │
│ (port 9000) │        │ (Cron Bridge)│        │ Cloud Server  │
└─────────────┘        └──────────────┘        └───────────────┘
│  Tally B    │◄──────────────────────►│
│ (port 9001) │
└─────────────┘`}
          </pre>
          <p className="text-sm text-gray-600 mt-2">
            Every minute, the Node agent synchronizes data both ways for Company
            A and B.
          </p>
        </Section>

        {/* Cron Workflow */}
        <Section icon={<Clock />} title="1-Minute Cron Workflow">
          <ol className="list-decimal ml-6 space-y-2 text-sm">
            <li>
              <strong>Fetch</strong> inventory and customers from Tally A & B.
            </li>
            <li>
              <strong>Compare hash</strong> of data → only send to VPS if
              changed.
            </li>
            <li>
              <strong>POST</strong> to <code>/sync/inventory</code> and{" "}
              <code>/sync/customers</code>.
            </li>
            <li>
              <strong>GET</strong> unsynced sales from VPS
              (<code>syncStatus: pending</code>).
            </li>
            <li>
              <strong>PATCH</strong> sale → mark as{" "}
              <code>processing</code> before sending to Tally.
            </li>
            <li>
              <strong>POST</strong> to correct Tally port’s{" "}
              <code>/addSale</code>.
            </li>
            <li>
              On success, <code>POST /tally/confirm-sale</code> with invoice
              number → set <code>syncStatus: synced</code>.
            </li>
          </ol>
        </Section>

        {/* New 3-state Sync Section */}
        <Section icon={<ShieldCheck />} title="Duplicate-Safe 3-State Sync Logic">
          <p className="text-sm leading-relaxed">
            To avoid duplicate voucher creation when confirmations are delayed,
            the system now uses a 3-state <strong>syncStatus</strong> field:
          </p>
          <table className="table-auto w-full border text-sm mt-3">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">State</th>
                <th className="p-2 border">Meaning</th>
              </tr>
            </thead>
            <tbody>
              <Row name="pending" role="Sale not yet sent to Tally" />
              <Row
                name="processing"
                role="Currently being posted to Tally (excluded from next pull)"
              />
              <Row name="synced" role="Successfully inserted & confirmed" />
            </tbody>
          </table>

          <p className="text-sm mt-3">
            ➤ If Node crashes mid-process, the record remains
            <code>processing</code> and can be retried manually later.
          </p>

          <p className="text-sm mt-3">
            ➤ Optional safeguard: the TDL’s <code>/addSale</code> checks for a
            unique <code>ExternalRef</code> (e.g. order ID or Mongo _id) and
            returns an existing invoice instead of creating a duplicate.
          </p>
        </Section>

        {/* Example Script */}
        <Section icon={<Code />} title="Example Node.js Sync Script">
          <pre className="bg-gray-900 text-green-300 text-xs p-4 rounded-lg overflow-x-auto">
{`import axios from "axios";
import cron from "node-cron";
import fs from "fs";
import crypto from "crypto";

const vpsBase = "https://api.yourapp.com";
const tally = { A: "http://localhost:9000", B: "http://localhost:9001" };
const hash = (obj) => crypto.createHash("md5").update(JSON.stringify(obj)).digest("hex");

async function syncTally(key, baseURL) {
  const [inv, cust] = await Promise.all([
    axios.get(baseURL + "/getInventory"),
    axios.get(baseURL + "/getCustomers"),
  ]);

  const invHash = hash(inv.data), custHash = hash(cust.data);
  let state = fs.existsSync("./data/syncState.json")
      ? JSON.parse(fs.readFileSync("./data/syncState.json", "utf8")) : {};

  if (state[key]?.invHash !== invHash) {
    await axios.post(vpsBase + "/sync/inventory", { company: key, data: inv.data });
    state[key] = { ...state[key], invHash };
  }
  if (state[key]?.custHash !== custHash) {
    await axios.post(vpsBase + "/sync/customers", { company: key, data: cust.data });
    state[key] = { ...state[key], custHash };
  }
  fs.writeFileSync("./data/syncState.json", JSON.stringify(state, null, 2));

  const pending = await axios.get(vpsBase + "/tally/pending-sales");
  for (const sale of pending.data.sales.filter((s) => s.company === key)) {
    await axios.patch(vpsBase + "/tally/mark-processing", { id: sale._id });
    const res = await axios.post(baseURL + "/addSale", sale.data);
    if (res.data.success)
      await axios.post(vpsBase + "/tally/confirm-sale", {
        id: sale._id,
        invoiceNo: res.data.invoiceNo,
        success: true,
      });
  }
  console.log(key, "Sync complete", new Date().toLocaleTimeString());
}

cron.schedule("*/1 * * * *", () =>
  Object.entries(tally).forEach(([k, u]) => syncTally(k, u))
);`}
          </pre>
        </Section>

        {/* Responsibilities */}
        <Section icon={<Users />} title="Developer Responsibilities">
          <ul className="list-disc ml-6 space-y-1 text-sm">
            <li>
              <strong>Tally Developer</strong> – Provide TDL exposing JSON APIs
              (<code>/getInventory</code>, <code>/getCustomers</code>,
              <code>/addSale</code>) with duplicate-safe logic.
            </li>
            <li>
              <strong>Node Developer</strong> – Maintain cron agent, hash check,
              3-state sync, and local queue.
            </li>
            <li>
              <strong>VPS Developer</strong> – Build cloud endpoints and manage
              MongoDB updates.
            </li>
          </ul>
        </Section>

        {/* Result */}
        <section className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2 text-green-700">
            <CheckCircle /> Expected Outcome
          </h2>
          <p className="text-sm leading-relaxed">
            ✅ Inventory & customers from both Tally instances stay synced with
            the VPS. <br />
            ✅ Sales created in VPS are automatically posted to correct Tally
            company. <br />
            ✅ Confirmation updates ensure no duplicates or missing records.{" "}
            <br />
            ✅ Stable, resilient, real-time sync across all systems.
          </p>
        </section>
      </main>

      <footer className="text-center text-xs text-gray-500 py-4">
        Built with ❤️ using TailwindCSS · © 2025 Honor Tech
      </footer>
    </div>
  );
}

/* Helper components */
function Section({ icon, title, children }) {
  return (
    <section className="bg-white shadow rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ name, role }) {
  return (
    <tr>
      <td className="border p-2 font-medium">{name}</td>
      <td className="border p-2">{role}</td>
    </tr>
  );
}
