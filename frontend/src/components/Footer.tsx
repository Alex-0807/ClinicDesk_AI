export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="mx-auto max-w-4xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-gray-400">
          ClinicDesk AI &mdash; Portfolio demo. Not for clinical use.
        </p>
        <p className="text-xs text-gray-400">
          Fake data only. No medical advice.
        </p>
      </div>
    </footer>
  );
}
