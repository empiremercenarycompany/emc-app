export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-6" aria-busy="true">
      <p className="display text-2xl">Opening the gates...</p>
      <div className="mt-6 flex flex-col gap-3">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton short" />
      </div>
    </main>
  );
}
