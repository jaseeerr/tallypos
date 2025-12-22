import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📄 PRIVACY POLICY — Internal Company Application (TallyPOS)
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          <strong>Last Updated:</strong> &#123;Insert Date&#125;
          <br />
          <strong>Applies To:</strong> Internal staff and authorized personnel only
        </p>

        {/* Section 1 */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
          <p className="mb-2">
            This Privacy Policy describes how our internal business application
            (“the App”) handles information.
          </p>
          <p className="mb-2">
            The App is used exclusively within our company for:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Managing customers</li>
            <li>Managing inventory</li>
            <li>Creating and storing sales</li>
            <li>Syncing sales and customer data with Tally</li>
            <li>Maintaining accounting and stock accuracy</li>
          </ul>
          <p className="mt-2">
            The App is not for public use and is accessible only to authorized
            company employees.
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
          <p className="mb-2">
            The App collects only the data necessary for accounting, inventory,
            and business operations.
          </p>

          <h3 className="font-semibold mt-4 mb-1">2.1 Customer Information</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Customer Name</li>
            <li>Customer Group</li>
            <li>Address lines</li>
            <li>Contact person</li>
            <li>Phone number</li>
            <li>Email address</li>
            <li>Company to which the customer belongs</li>
            <li>Ledger Name &amp; Ledger Group (from Tally)</li>
            <li>Party Code, VAT Number (if applicable)</li>
            <li>Date of last sync</li>
          </ul>
          <p className="mt-2">
            This information is strictly used for billing, sales, and accounting
            workflows.
          </p>

          <h3 className="font-semibold mt-4 mb-1">2.2 Inventory Information</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Item name, code, and group</li>
            <li>Available quantity</li>
            <li>Unit</li>
            <li>Average rate, selling rate</li>
            <li>VAT percentage</li>
            <li>Company name associated with the item</li>
            <li>Product image (uploaded manually by staff)</li>
          </ul>
          <p className="mt-2">
            The App does not collect any images automatically—only user-selected
            uploads.
          </p>

          <h3 className="font-semibold mt-4 mb-1">2.3 Sales Information</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Bill number</li>
            <li>Sale date</li>
            <li>Reference and remarks</li>
            <li>Customer (or Cash Sale) details</li>
            <li>List of items with qty, rate, VAT %, and amounts</li>
            <li>Subtotal, VAT amount, and total amount</li>
            <li>Company name</li>
            <li>Whether VAT is included</li>
          </ul>
          <p className="mt-2">
            All sales data is business operational data and belongs to the
            company.
          </p>

          <h3 className="font-semibold mt-4 mb-1">
            2.4 System &amp; Technical Logs (Non-personal)
          </h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Sync timestamps</li>
            <li>Error logs</li>
            <li>Application state messages</li>
          </ul>
          <p className="mt-2">
            These logs do not contain private personal information.
          </p>
        </section>

        {/* Section 3 */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            3. How the Information is Used
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Customer management</li>
            <li>Inventory management</li>
            <li>Sales entry and invoice generation</li>
            <li>Synchronizing data with Tally</li>
            <li>Internal accounting audits</li>
            <li>Data accuracy and operational improvements</li>
          </ul>
          <p className="mt-2">
            No data is used for marketing, analytics, or sold to any third
            parties.
          </p>
        </section>

        {/* Section 4 */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">4. Data Sharing</h2>

          <h3 className="font-semibold mt-2">4.1 Within the Company</h3>
          <p>
            All data remains inside the company and is accessible only to
            authorized staff.
          </p>

          <h3 className="font-semibold mt-2">4.2 Tally Integration</h3>
          <p>
            Sales, customers, and inventory updates may be shared with Tally
            during sync operations.
          </p>

          <h3 className="font-semibold mt-2">4.3 Legal Requirements</h3>
          <p>
            If required by law, the company may disclose relevant business
            records.
          </p>

          <p className="mt-2">
            There is no external sharing of any kind.
          </p>
        </section>

        {/* Section 5 */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">5. Data Security</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Restricted access to authorized staff only</li>
            <li>Controlled internal credentials</li>
            <li>Secure data storage</li>
            <li>Monitoring and logging of sync operations</li>
            <li>No unnecessary data collection</li>
          </ul>
          <p className="mt-2">
            Images are uploaded only when a user explicitly chooses a file.
          </p>
        </section>

        {/* Section 6 */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">6. Data Retention</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Company policy</li>
            <li>Accounting retention requirements applicable in our region</li>
          </ul>
          <p className="mt-2">
            Data may be archived but not deleted unless approved by management.
          </p>
        </section>

        {/* Section 7 */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            7. Employee Responsibilities
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Keep their access credentials secure</li>
            <li>Use the App only for authorized business purposes</li>
            <li>Not share internal data outside the company</li>
            <li>Report issues or breaches immediately</li>
          </ul>
          <p className="mt-2">
            Misuse may lead to disciplinary action as per company policy.
          </p>
        </section>

        {/* Section 8 */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">8. Device Permissions</h2>

          <h3 className="font-semibold mt-2">Camera</h3>
          <p>
            Used only for scanning QR/Barcodes. Never used to capture photos or
            videos without explicit user action.
          </p>

          <h3 className="font-semibold mt-2">Storage / File Access</h3>
          <p>
            Used only for manually uploading product images. No other files or
            data are accessed by the App.
          </p>
        </section>

        {/* Section 9 */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">9. Children’s Privacy</h2>
          <p>
            This is a business application, not intended for children. No minors
            will ever use or access the App.
          </p>
        </section>

        {/* Section 10 */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            10. Updates to This Policy
          </h2>
          <p>
            The company may update this policy at any time. Any changes will be
            communicated to staff.
          </p>
        </section>

        {/* Section 11 */}
        <section>
          <h2 className="text-xl font-semibold mb-2">
            11. Contact / Internal Support
          </h2>
          <p>
            For any questions or concerns, employees may contact:
            <br />
            <strong>IT Team / System Administrator</strong>
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
