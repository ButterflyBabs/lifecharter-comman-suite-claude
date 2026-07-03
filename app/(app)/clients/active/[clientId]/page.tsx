export default function Page({ params }: { params: { clientId: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-deep-indigo">Active Client Record</h1>
      <p className="mt-2 text-sm text-soft-taupe">Route: /clients/active/{params.clientId}</p>
      <p className="mt-4 text-sm">Scaffolded in Phase 0. Module implementation follows the build
      order in Section 18 of the Master Product Restructure Specification.</p>
    </div>
  );
}
