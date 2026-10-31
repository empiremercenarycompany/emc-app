export default function Loading() {
  return (
    <main className="page-pad page-wrap px-4 pt-4" aria-busy="true" aria-label="Opening the gates">
      <div className="skeleton short" />
      <div className="mt-4 flex flex-col gap-3">
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </main>
  );
}
